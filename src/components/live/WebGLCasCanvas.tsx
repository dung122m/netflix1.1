"use client";

import React, { useEffect, useRef, useState, memo } from "react";

interface WebGLCasCanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  sharpness?: number; // 0.0 to 1.0 (default: 0.75)
  onError?: () => void;
  className?: string;
}

const VS_SOURCE = `
attribute vec2 a_position;
varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  // Video coordinates: (0,0) at top-left
  v_texCoord = vec2((a_position.x + 1.0) * 0.5, (1.0 - a_position.y) * 0.5);
}
`;

// Tinh chỉnh hợp nhất: AMD FidelityFX CAS + Tăng tương phản & Màu cỏ sân bóng
const FS_SOURCE = `
precision highp float;

varying vec2 v_texCoord;
uniform sampler2D u_image;
uniform vec2 u_texSize;
uniform float u_sharpness;

void main() {
  vec2 onePixel = vec2(1.0, 1.0) / u_texSize;
  vec2 p = v_texCoord;

  // Lấy mẫu ma trận 3x3 dạng chữ thập
  vec3 a = texture2D(u_image, p + vec2(0.0, -onePixel.y)).rgb;
  vec3 b = texture2D(u_image, p + vec2(-onePixel.x, 0.0)).rgb;
  vec3 e = texture2D(u_image, p).rgb;
  vec3 d = texture2D(u_image, p + vec2(onePixel.x, 0.0)).rgb;
  vec3 c = texture2D(u_image, p + vec2(0.0, onePixel.y)).rgb;

  // Tính độ sáng Luma theo chuẩn Rec.709 cho Video HD
  vec3 lumaW = vec3(0.2126, 0.7152, 0.0722);
  float la = dot(a, lumaW);
  float lb = dot(b, lumaW);
  float le = dot(e, lumaW);
  float ld = dot(d, lumaW);
  float lc = dot(c, lumaW);

  // Tìm min và max luma trong vùng cục bộ
  float minL = min(le, min(min(la, lb), min(lc, ld)));
  float maxL = max(le, max(max(la, lb), max(lc, ld)));

  // Thuật toán thích ứng tương phản CAS (làm nét biên viền, không làm nhiễu hạt)
  float amp = clamp(min(minL, 1.0 - maxL) / max(maxL - minL, 0.0001), 0.0, 1.0);
  float w = -sqrt(amp) * 0.25 * clamp(u_sharpness, 0.0, 1.0);

  // Tích chập làm nét
  vec3 color = (a * w + b * w + c * w + d * w + e) / (1.0 + 4.0 * w);

  // Tinh chỉnh tối ưu màu sân cỏ & tương phản bóng đá
  float gray = dot(color, lumaW);
  color = mix(vec3(gray), color, 1.08); // Bão hòa màu cỏ sân vận động +8%
  color = (color - 0.5) * 1.05 + 0.5;   // Tăng tương phản nhẹ +5% cho bóng & đường biên

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}
`;

function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("CAS Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export const WebGLCasCanvas = memo(function WebGLCasCanvas({
  videoRef,
  enabled = true,
  sharpness = 0.75,
  onError,
  className = "",
}: WebGLCasCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const bufferRef = useRef<WebGLBuffer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const rvfcHandleRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsReady(false);
      setHasDrawn(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) {
      console.warn("WebGL not supported for CAS Shader");
      onError?.();
      return;
    }

    glRef.current = gl;

    const vs = createShader(gl, gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FS_SOURCE);

    if (!vs || !fs) {
      onError?.();
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      onError?.();
      return;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("CAS Program link error:", gl.getProgramInfoLog(program));
      onError?.();
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Fullscreen quad [-1, -1] to [1, 1]
    const buffer = gl.createBuffer();
    bufferRef.current = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const posAttr = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(posAttr);
    gl.vertexAttribPointer(posAttr, 2, gl.FLOAT, false, 0, 0);

    // Texture setup
    const texture = gl.createTexture();
    textureRef.current = texture;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    setIsReady(true);

    const videoEl = videoRef.current;
    return () => {
      setIsReady(false);
      setHasDrawn(false);
      if (rvfcHandleRef.current !== null && videoEl && "cancelVideoFrameCallback" in videoEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (videoEl as any).cancelVideoFrameCallback(rvfcHandleRef.current);
        rvfcHandleRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      if (gl) {
        if (texture) gl.deleteTexture(texture);
        if (buffer) gl.deleteBuffer(buffer);
        if (program) gl.deleteProgram(program);
        if (vs) gl.deleteShader(vs);
        if (fs) gl.deleteShader(fs);
      }
      glRef.current = null;
      programRef.current = null;
      textureRef.current = null;
      bufferRef.current = null;
    };
  }, [enabled, onError, videoRef]);

  // Main render loop
  useEffect(() => {
    if (!enabled || !isReady) return;

    let isRunning = true;
    const gl = glRef.current;
    const program = programRef.current;
    const texture = textureRef.current;
    const canvas = canvasRef.current;
    const videoEl = videoRef.current;

    if (!gl || !program || !texture || !canvas) return;

    const texSizeLoc = gl.getUniformLocation(program, "u_texSize");
    const sharpnessLoc = gl.getUniformLocation(program, "u_sharpness");
    const imageLoc = gl.getUniformLocation(program, "u_image");

    const renderFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;

        // Resize canvas buffer if needed
        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
          gl.viewport(0, 0, vw, vh);
        }

        gl.useProgram(program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          video,
        );

        gl.uniform1i(imageLoc, 0);
        gl.uniform2f(texSizeLoc, vw, vh);
        gl.uniform1f(sharpnessLoc, sharpness);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
        setHasDrawn(true);
      }

      // Use requestVideoFrameCallback for 60fps power-efficiency if supported
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (video && typeof (video as any).requestVideoFrameCallback === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rvfcHandleRef.current = (video as any).requestVideoFrameCallback(renderFrame);
      } else {
        animFrameIdRef.current = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      isRunning = false;
      if (rvfcHandleRef.current !== null && videoEl && "cancelVideoFrameCallback" in videoEl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (videoEl as any).cancelVideoFrameCallback(rvfcHandleRef.current);
        rvfcHandleRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [enabled, isReady, sharpness, videoRef]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full object-contain pointer-events-none z-10 transition-opacity duration-300 ${
        isReady && hasDrawn ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
});
