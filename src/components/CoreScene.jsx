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
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(0, 0, 4.8)

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const root = new THREE.Group()
    scene.add(root)

    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x8deeff,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    })
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.72, 3),
      coreMaterial,
    )
    root.add(core)

    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0x39c8ef,
      transparent: true,
      opacity: 0.11,
      side: THREE.DoubleSide,
    })
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 36, 24),
      innerMaterial,
    )
    root.add(inner)

    const ringMaterials = []
    const ringConfigs = [
      [1.05, 0.008, 0x66e5ff, 0.45, 0.1, 0.9],
      [1.32, 0.006, 0x2bb9df, 0.31, 1.1, 0.2],
      [1.62, 0.004, 0xeaa54d, 0.26, 0.3, 1.2],
      [1.92, 0.003, 0x53d9f7, 0.18, 1.4, 0.7],
    ]

    ringConfigs.forEach(([radius, tube, color, opacity, rx, ry], index) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
      })
      ringMaterials.push(material)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 180),
        material,
      )
      ring.rotation.x = rx
      ring.rotation.y = ry
      ring.userData.speed = index % 2 === 0 ? 1 : -1
      root.add(ring)
    })

    const particleCount = 260
    const particlePositions = new Float32Array(particleCount * 3)

    for (let index = 0; index < particleCount; index += 1) {
      const radius = 1.1 + Math.random() * 1.9
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      particlePositions[index * 3] =
        radius * Math.sin(phi) * Math.cos(theta)
      particlePositions[index * 3 + 1] =
        radius * Math.sin(phi) * Math.sin(theta)
      particlePositions[index * 3 + 2] = radius * Math.cos(phi)
    }

    const particleGeometry = new THREE.BufferGeometry()
    particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(particlePositions, 3),
    )
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x70e8ff,
      size: 0.018,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    root.add(particles)

    const cursor = { x: 0, y: 0 }

    function onPointerMove(event) {
      const rect = mount.getBoundingClientRect()
      cursor.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
      cursor.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2
    }

    mount.addEventListener('pointermove', onPointerMove)

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
          ? 2.7
          : mode === 'LISTENING'
            ? 1.65
            : mode === 'SPEAKING'
              ? 1.9
              : 0.72

      root.rotation.y += (cursor.x * 0.12 - root.rotation.y) * 0.025
      root.rotation.x += (-cursor.y * 0.07 - root.rotation.x) * 0.025

      core.rotation.x = elapsed * 0.17 * speed
      core.rotation.y = elapsed * 0.26 * speed
      inner.scale.setScalar(
        1 + Math.sin(elapsed * (mode === 'SPEAKING' ? 8 : 2.2)) * 0.035,
      )

      root.children.forEach((child) => {
        if (child.userData?.speed) {
          child.rotation.z += 0.0015 * speed * child.userData.speed
        }
      })

      particles.rotation.y = -elapsed * 0.025 * speed
      particles.rotation.x = elapsed * 0.014

      const error = mode === 'ERROR'
      coreMaterial.color.setHex(error ? 0xeaa54d : 0x8deeff)
      particleMaterial.color.setHex(error ? 0xeaa54d : 0x70e8ff)

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      mount.removeEventListener('pointermove', onPointerMove)
      particleGeometry.dispose()
      particleMaterial.dispose()
      core.geometry.dispose()
      coreMaterial.dispose()
      inner.geometry.dispose()
      innerMaterial.dispose()
      root.children.forEach((child) => {
        child.geometry?.dispose?.()
        if (child.material && child.material !== particleMaterial) {
          child.material.dispose?.()
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="core-scene" ref={mountRef} aria-hidden="true" />
}
