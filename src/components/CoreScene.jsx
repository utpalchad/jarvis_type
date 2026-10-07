import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function CoreScene({ status }) {
  const mountRef = useRef(null)
  const statusRef = useRef(status)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0, 5.8)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    mount.appendChild(renderer.domElement)

    const root = new THREE.Group()
    scene.add(root)

    const warm = new THREE.Color(0xff9b3d)
    const hot = new THREE.Color(0xff4b22)
    const pale = new THREE.Color(0xffd59a)

    const energyMaterial = new THREE.MeshBasicMaterial({
      color: warm,
      wireframe: true,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.42, 4),
      energyMaterial,
    )
    root.add(nucleus)

    const nucleusGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.33, 32, 24),
      new THREE.MeshBasicMaterial({
        color: pale,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    root.add(nucleusGlow)

    const rings = []
    const ringDefs = [
      [0.72, 0.014, 0xffcf82, 0.92, 0.1, 0.8, 1],
      [0.92, 0.008, 0xff8a35, 0.76, 1.0, 0.2, -1],
      [1.16, 0.010, 0xff5d25, 0.68, 0.4, 1.25, 1],
      [1.42, 0.007, 0xffb45d, 0.52, 1.3, 0.5, -1],
      [1.70, 0.006, 0xff4a28, 0.46, 0.7, 1.6, 1],
      [2.02, 0.004, 0xff9d42, 0.34, 1.55, 0.25, -1],
    ]

    ringDefs.forEach(([radius, tube, color, opacity, rx, ry, direction], index) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 10, 220),
        material,
      )
      ring.rotation.x = rx
      ring.rotation.y = ry
      ring.userData.speed = (0.45 + index * 0.12) * direction
      root.add(ring)
      rings.push(ring)
    })

    const circuitGroup = new THREE.Group()
    root.add(circuitGroup)

    const circuitMaterial = new THREE.LineBasicMaterial({
      color: 0xff8d3a,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
    })

    for (let index = 0; index < 120; index += 1) {
      const radius = 0.58 + Math.random() * 1.52
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const length = 0.08 + Math.random() * 0.26

      const start = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      )
      const end = start
        .clone()
        .normalize()
        .multiplyScalar(radius + length)

      const bend = start.clone().lerp(end, 0.5)
      bend.x += (Math.random() - 0.5) * 0.12
      bend.y += (Math.random() - 0.5) * 0.12
      bend.z += (Math.random() - 0.5) * 0.12

      const geometry = new THREE.BufferGeometry().setFromPoints([
        start,
        bend,
        end,
      ])
      const line = new THREE.Line(geometry, circuitMaterial)
      line.userData.phase = Math.random() * Math.PI * 2
      circuitGroup.add(line)
    }

    const arcGroup = new THREE.Group()
    root.add(arcGroup)

    for (let index = 0; index < 26; index += 1) {
      const radius = 0.75 + Math.random() * 1.3
      const start = Math.random() * Math.PI * 2
      const span = 0.12 + Math.random() * 0.75
      const curve = new THREE.EllipseCurve(
        0,
        0,
        radius,
        radius,
        start,
        start + span,
        false,
        0,
      )
      const points = curve.getPoints(36).map((point) => new THREE.Vector3(point.x, point.y, 0))
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: index % 4 === 0 ? 0xff3b28 : 0xffa23f,
        transparent: true,
        opacity: 0.22 + Math.random() * 0.45,
        blending: THREE.AdditiveBlending,
      })
      const arc = new THREE.Line(geometry, material)
      arc.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      )
      arc.userData.speed = (Math.random() * 0.7 + 0.25) * (index % 2 ? 1 : -1)
      arcGroup.add(arc)
    }

    const particleCount = 900
    const particlePositions = new Float32Array(particleCount * 3)
    const particleSizes = new Float32Array(particleCount)

    for (let index = 0; index < particleCount; index += 1) {
      const radius = 0.45 + Math.pow(Math.random(), 0.58) * 2.15
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      particlePositions[index * 3] =
        radius * Math.sin(phi) * Math.cos(theta)
      particlePositions[index * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta)
      particlePositions[index * 3 + 2] = radius * Math.cos(phi)
      particleSizes[index] = 0.012 + Math.random() * 0.03
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3),
    )
    particleGeometry.setAttribute(
      'size',
      new THREE.BufferAttribute(particleSizes, 1),
    )

    const particleMaterial = new THREE.PointsMaterial({
      color: warm,
      size: 0.024,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    root.add(particles)

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xff511f,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.25, 48, 32),
      haloMaterial,
    )
    root.add(halo)

    const cursor = { x: 0, y: 0 }
    let pulse = 0

    function onPointerMove(event) {
      const rect = mount.getBoundingClientRect()
      cursor.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      cursor.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2
    }

    function onPointerDown() {
      pulse = 1
    }

    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerdown', onPointerDown)

    function resize() {
      const width = Math.max(mount.clientWidth, 1)
      const height = Math.max(mount.clientHeight, 1)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const clock = new THREE.Clock()
    let frameId

    function animate() {
      const elapsed = clock.getElapsedTime()
      const mode = statusRef.current
      const speed =
        mode === 'PROCESSING'
          ? 2.9
          : mode === 'LISTENING'
            ? 1.75
            : mode === 'SPEAKING'
              ? 2.15
              : mode === 'ERROR'
                ? 1.2
                : 0.82

      root.rotation.y += (cursor.x * 0.17 - root.rotation.y) * 0.025
      root.rotation.x += (-cursor.y * 0.11 - root.rotation.x) * 0.025

      nucleus.rotation.x = elapsed * 0.37 * speed
      nucleus.rotation.y = elapsed * 0.52 * speed

      rings.forEach((ring, index) => {
        ring.rotation.z += 0.0018 * ring.userData.speed * speed
        ring.rotation.x += Math.sin(elapsed * 0.35 + index) * 0.00018
      })

      circuitGroup.rotation.y = elapsed * 0.035 * speed
      circuitGroup.rotation.x = Math.sin(elapsed * 0.28) * 0.16
      arcGroup.rotation.y = -elapsed * 0.055 * speed
      arcGroup.rotation.z = elapsed * 0.035

      arcGroup.children.forEach((arc) => {
        arc.rotation.z += 0.0015 * arc.userData.speed * speed
      })

      particles.rotation.y = -elapsed * 0.028 * speed
      particles.rotation.x = elapsed * 0.012

      pulse *= 0.92
      const voicePulse =
        mode === 'SPEAKING'
          ? Math.sin(elapsed * 9) * 0.045
          : mode === 'PROCESSING'
            ? Math.sin(elapsed * 5.5) * 0.025
            : 0

      const scale = 1 + pulse * 0.15 + voicePulse
      nucleusGlow.scale.setScalar(scale)
      halo.scale.setScalar(1 + pulse * 0.08)

      if (mode === 'ERROR') {
        energyMaterial.color.lerp(hot, 0.08)
        particleMaterial.color.lerp(hot, 0.08)
      } else {
        energyMaterial.color.lerp(warm, 0.05)
        particleMaterial.color.lerp(warm, 0.05)
      }

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerdown', onPointerDown)

      root.traverse((child) => {
        child.geometry?.dispose?.()
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose?.())
        } else {
          child.material?.dispose?.()
        }
      })

      particleGeometry.dispose()
      particleMaterial.dispose()
      circuitMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      className="core-scene core-scene-v2"
      ref={mountRef}
      aria-label="Interactive neural core"
      role="img"
    />
  )
}
