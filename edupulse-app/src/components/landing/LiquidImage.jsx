import { useEffect, useRef } from 'react'

// A photograph drawn through a small WebGL shader: a very slow liquid shimmer, a soft
// lens and colour split where the mouse rests, and a zoom the hero timeline can drive
// through `state.zoom`. The <img> underneath stays as the fallback (no WebGL, reduced
// motion, coarse pointers), so the picture never depends on the shader.
const VERTEX = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}'
const FRAGMENT = `precision mediump float;
varying vec2 v;uniform sampler2D img;uniform vec2 res,size,mouse;uniform float time,hover,zoom;
vec3 permute(vec3 x){return mod(((x*34.)+1.)*x,289.);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);
vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
void main(){
vec2 r=vec2(min((res.x/res.y)/(size.x/size.y),1.),min((res.y/res.x)/(size.y/size.x),1.));
vec2 uv=vec2(v.x*r.x+(1.-r.x)*.5,(1.-v.y)*r.y+(1.-r.y)*.5);
uv=(uv-.5)/zoom+.5;
vec2 d=vec2(snoise(uv*2.2+time*.03),snoise(uv*2.2-time*.025))*.0045;
float m=smoothstep(.32,0.,distance(v,mouse))*hover;
d+=(v-mouse)*m*.035;float s=.0012+m*.005;
gl_FragColor=vec4(texture2D(img,uv+d+vec2(s,0.)).r,texture2D(img,uv+d).g,texture2D(img,uv+d-vec2(s,0.)).b,1.);}`

function program(gl) {
  const make = (type, source) => { const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader); return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null }
  const vs = make(gl.VERTEX_SHADER, VERTEX), fs = make(gl.FRAGMENT_SHADER, FRAGMENT)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog)
  return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null
}

export default function LiquidImage({ src, srcSmall, alt = '', className = '', state }) {
  const wrap = useRef(null), image = useRef(null), canvas = useRef(null)

  useEffect(() => {
    const box = wrap.current, img = image.current, cv = canvas.current
    if (!box || !img || !cv) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(pointer: fine)').matches) return
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    const prog = gl && program(gl)
    if (!prog) return
    let frame = 0, visible = false, disposed = false, ready = false
    const pointer = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, hover: 0, target: 0 }
    gl.useProgram(prog)
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const u = name => gl.getUniformLocation(prog, name)
    const uniforms = { res: u('res'), size: u('size'), mouse: u('mouse'), time: u('time'), hover: u('hover'), zoom: u('zoom') }
    const texture = gl.createTexture()

    const resize = () => {
      const area = box.clientWidth * box.clientHeight
      const dpr = Math.min(window.devicePixelRatio || 1, area > 900000 ? 1 : 1.5)
      cv.width = Math.max(1, Math.round(box.clientWidth * dpr)); cv.height = Math.max(1, Math.round(box.clientHeight * dpr))
      gl.viewport(0, 0, cv.width, cv.height)
    }
    const draw = now => {
      frame = 0
      if (disposed || !ready) return
      pointer.x += (pointer.tx - pointer.x) * 0.08; pointer.y += (pointer.ty - pointer.y) * 0.08; pointer.hover += (pointer.target - pointer.hover) * 0.06
      gl.uniform2f(uniforms.res, cv.width, cv.height)
      gl.uniform2f(uniforms.mouse, pointer.x, pointer.y)
      gl.uniform1f(uniforms.time, now / 1000)
      gl.uniform1f(uniforms.hover, pointer.hover)
      gl.uniform1f(uniforms.zoom, state?.zoom || 1)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      if (visible) frame = requestAnimationFrame(draw)
    }
    const start = () => { if (!frame && visible && ready) frame = requestAnimationFrame(draw) }
    const upload = () => {
      if (disposed) return
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img)
      gl.uniform2f(uniforms.size, img.naturalWidth, img.naturalHeight)
      ready = true
      box.classList.add('is-live')
      start()
    }
    const move = event => { const r = box.getBoundingClientRect(); pointer.tx = (event.clientX - r.left) / r.width; pointer.ty = 1 - (event.clientY - r.top) / r.height; pointer.target = 1; start() }
    const leave = () => { pointer.target = 0 }
    const sizes = new ResizeObserver(resize)
    const seen = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; start() })
    resize(); sizes.observe(box); seen.observe(box)
    window.addEventListener('pointermove', move, { passive: true })
    box.addEventListener('pointerleave', leave)
    if (img.complete && img.naturalWidth) upload(); else img.addEventListener('load', upload, { once: true })
    return () => {
      disposed = true
      cancelAnimationFrame(frame); sizes.disconnect(); seen.disconnect()
      window.removeEventListener('pointermove', move); box.removeEventListener('pointerleave', leave); img.removeEventListener('load', upload)
      box.classList.remove('is-live')
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [state])

  return (
    <div ref={wrap} className={`liquid ${className}`.trim()}>
      <picture>
        {srcSmall && <source media="(max-width: 760px)" srcSet={srcSmall} />}
        <img ref={image} src={src} alt={alt} className="liquid-img" decoding="async" fetchPriority="high" />
      </picture>
      <canvas ref={canvas} className="liquid-canvas" aria-hidden="true" />
    </div>
  )
}
