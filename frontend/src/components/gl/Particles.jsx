import * as THREE from "three"
import { useMemo, useState, useRef } from "react"
import { createPortal, useFrame } from "@react-three/fiber"
import { useFBO } from "@react-three/drei"
import * as easing from "maath/easing"

import { DofPointsMaterial } from "./shaders/pointMaterial"
import { SimulationMaterial } from "./shaders/simulationMaterial"

export function Particles({
  speed = 1.0,
  aperture = 1.79,
  focus = 3.8,
  size = 512,
  noiseScale = 0.6,
  noiseIntensity = 0.52,
  timeScale = 1,
  pointSize = 10.0,
  opacity = 0.8,
  planeScale = 10.0,
  introspect = false,
}) {
  const revealStartTime = useRef(null)
  const [isRevealing, setIsRevealing] = useState(true)
  const revealDuration = 3.5

  const simulationMaterial = useMemo(() => new SimulationMaterial(planeScale), [planeScale])

  const target = useFBO(size, size, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
  })

  const dofPointsMaterial = useMemo(() => {
    const m = new DofPointsMaterial()
    m.uniforms.positions.value = target.texture
    m.uniforms.initialPositions.value = simulationMaterial.uniforms.positions.value
    return m
  }, [simulationMaterial, target])

  const [scene] = useState(() => new THREE.Scene())
  const [camera] = useState(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 1 / Math.pow(2, 53), 1))
  const [positions] = useState(() => new Float32Array([-1,-1,0, 1,-1,0, 1,1,0, -1,-1,0, 1,1,0, -1,1,0]))
  const [uvs] = useState(() => new Float32Array([0,1, 1,1, 1,0, 0,1, 1,0, 0,0]))

  const particles = useMemo(() => {
    const length = size * size
    const arr = new Float32Array(length * 3)
    for (let i = 0; i < length; i++) {
      const i3 = i * 3
      arr[i3 + 0] = (i % size) / size
      arr[i3 + 1] = i / size / size
    }
    return arr
  }, [size])

  useFrame((state, delta) => {
    if (!dofPointsMaterial || !simulationMaterial) return

    state.gl.setRenderTarget(target)
    state.gl.clear()
    state.gl.render(scene, camera)
    state.gl.setRenderTarget(null)

    const currentTime = state.clock.elapsedTime

    if (revealStartTime.current === null) revealStartTime.current = currentTime

    const revealElapsed = currentTime - revealStartTime.current
    const revealProgress = Math.min(revealElapsed / revealDuration, 1.0)
    const easedProgress = 1 - Math.pow(1 - revealProgress, 3)
    const revealFactor = easedProgress * 4.0

    if (revealProgress >= 1.0 && isRevealing) setIsRevealing(false)

    dofPointsMaterial.uniforms.uTime.value = currentTime
    dofPointsMaterial.uniforms.uFocus.value = focus
    dofPointsMaterial.uniforms.uBlur.value = aperture

    easing.damp(
      dofPointsMaterial.uniforms.uTransition,
      "value",
      introspect ? 1.0 : 0.0,
      introspect ? 0.35 : 0.2,
      delta
    )

    simulationMaterial.uniforms.uTime.value = currentTime
    simulationMaterial.uniforms.uNoiseScale.value = noiseScale
    simulationMaterial.uniforms.uNoiseIntensity.value = noiseIntensity
    simulationMaterial.uniforms.uTimeScale.value = timeScale * speed

    dofPointsMaterial.uniforms.uPointSize.value = pointSize
    dofPointsMaterial.uniforms.uOpacity.value = opacity
    dofPointsMaterial.uniforms.uRevealFactor.value = revealFactor
    dofPointsMaterial.uniforms.uRevealProgress.value = easedProgress
  })

  return (
    <>
      {createPortal(
        <mesh material={simulationMaterial}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[positions, 3]} />
            <bufferAttribute attach="attributes-uv" args={[uvs, 2]} />
          </bufferGeometry>
        </mesh>,
        scene
      )}
      <points material={dofPointsMaterial}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles, 3]} />
        </bufferGeometry>
      </points>
    </>
  )
}
