"use client";

import { useEffect, useRef } from "react";

// ── Shaders ───────────────────────────────────────────────────
const VERT = `
attribute vec2 a_pos;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;
void main() {
  float breath = sin(u_time * 0.5 + a_pos.x * 0.007 + a_pos.y * 0.007) * 0.5 + 0.5;
  vec2 drift = (u_mouse - vec2(0.5)) * 12.0;
  vec2 pos = a_pos + drift;
  vec2 clip = (pos / u_res) * 2.0 - 1.0;
  clip.y *= -1.0;
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = 1.0 + breath * 1.2;
}`.trim();

const FRAG = `
precision mediump float;
void main() {
  vec2 coord = gl_PointCoord - 0.5;
  float d = length(coord) * 2.0;
  if (d > 1.0) discard;
  float alpha = (1.0 - d) * 0.45;
  gl_FragColor = vec4(0.22, 0.47, 0.88, alpha);
}`.trim();

// ── Helpers ───────────────────────────────────────────────────
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string
): WebGLShader | null {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function buildGrid(w: number, h: number, spacing = 30): Float32Array<ArrayBuffer> {
  const pts: number[] = [];
  for (let r = 0; r <= Math.ceil(h / spacing) + 1; r++)
    for (let c = 0; c <= Math.ceil(w / spacing) + 1; c++)
      pts.push(c * spacing, r * spacing);
  return new Float32Array(pts);
}

// ── Component ─────────────────────────────────────────────────
export default function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef  = useRef({ x: 0.5, y: 0.5 });
  const rafRef    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return; // graceful no-WebGL fallback

    // ── Compile program ──────────────────────────────
    const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vert || !frag) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vert);
    gl.attachShader(prog, frag);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // ── Locations ────────────────────────────────────
    const uRes   = gl.getUniformLocation(prog, "u_res");
    const uTime  = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");
    const aPos   = gl.getAttribLocation(prog, "a_pos");

    const buf = gl.createBuffer();
    let pts: Float32Array<ArrayBuffer> = new Float32Array(0);

    // ── Resize ───────────────────────────────────────
    const setup = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width  = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(uRes, w, h);
      pts = buildGrid(w, h);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, pts, gl.DYNAMIC_DRAW);
    };
    setup();
    window.addEventListener("resize", setup);

    // ── Mouse ────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight,
      };
    };
    window.addEventListener("mousemove", onMouse);

    // ── Render loop ──────────────────────────────────
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    const render = (t: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t / 1000);
      gl.uniform2f(uMouse, mouseRef.current.x, mouseRef.current.y);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, pts.length / 2);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", setup);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      style={{ opacity: 0.55 }}
      aria-hidden="true"
    />
  );
}
