import { Canvas } from "@react-three/fiber"
import { Effects } from "@react-three/drei"
import { Particles } from "./Particles"
import { VignetteShader } from "./shaders/vignetteShader"

export function GL({ hovering = false }) {
  return (
    <div id="webgl">
      <Canvas
        camera={{
          position: [1.2629783123314589, 2.664606471394044, -1.8178993743288914],
          fov: 50,
          near: 0.01,
          far: 300,
        }}
      >
        <color attach="background" args={["#000"]} />
        <Particles introspect={hovering} />
        <Effects multisamping={0} disableGamma>
          <shaderPass
            args={[VignetteShader]}
            uniforms-darkness-value={1.5}
            uniforms-offset-value={0.4}
          />
        </Effects>
      </Canvas>
    </div>
  )
}
