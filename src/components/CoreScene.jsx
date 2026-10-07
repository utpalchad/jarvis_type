import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function makePointCloud(count, minRadius, maxRadius, color, size, opacity) {
  const positions = new Float32Array(count * 3)

  for (let i = 0; i < count; i += 1) {
    const radius = minRadius + Math.random() * (maxRadius - minRadius)
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = radius * Math.cos(phi)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  })

  return new THREE.Points(geometry, material)
}

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
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)
    camera.position.set(0, 0, 5.55)

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
    const shell = new THREE.Group()
    const orbitSystem = new THREE.Group()
    const arcSystem = new THREE.Group()
    root.add(shell, orbitSystem, arcSystem)
    scene.add(root)

    const warm = new THREE.Color(0xff9a3b)
    const amber = new THREE.Color(0xffc36c)
    const hot = new THREE.Color(0xff3f24)
    const pale = new THREE.Color(0xffe1b3)

    const nucleusMaterial = new THREE.MeshBasicMaterial({
      color: pale,
      wireframe: true,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const nucleus = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.35, 4),
      nucleusMaterial,
    )
    root.add(nucleus)

    const nucleusGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffb45a,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const nucleusGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 24),
      nucleusGlowMaterial,
    )
    root.add(nucleusGlow)

    const shellMaterials = []
    ;[
      [0.78, 0xffb85a, 0.30],
      [1.18, 0xff7136, 0.18],
      [1.62, 0xff5b2b, 0.11],
      [2.02, 0xffa143, 0.075],
    ].forEach(([radius, color, opacity], index) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      shellMaterials.push(material)
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 28 + index * 8, 18 + index * 4),
        material,
      )
      sphere.rotation.set(index * 0.31, index * 0.52, index * 0.19)
      sphere.userData.spin = index % 2 === 0 ? 1 : -1
      shell.add(sphere)
    })

    const rings = []
    const ringDefs = [
      [0.55, 0.014, 0xffe0a0, 0.96, 0.15, 0.25, 1.2],
      [0.76, 0.010, 0xffbd63, 0.82, 1.1, 0.15, -1.0],
      [0.95, 0.008, 0xff8d39, 0.78, 0.45, 1.32, 0.85],
      [1.17, 0.010, 0xff6f30, 0.68, 1.36, 0.45, -0.7],
      [1.39, 0.007, 0xffa94a, 0.58, 0.74, 1.58, 0.62],
      [1.62, 0.006, 0xff522b, 0.48, 1.5, 0.82, -0.52],
      [1.87, 0.005, 0xff9d40, 0.34, 0.23, 1.9, 0.42],
      [2.12, 0.004, 0xff6a32, 0.24, 1.82, 0.24, -0.34],
    ]

    ringDefs.forEach(([radius, tube, color, opacity, rx, ry, spin]) => {
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(radius, tube, 8, 220),
        material,
      )
      ring.rotation.x = rx
      ring.rotation.y = ry
      ring.userData.spin = spin
      orbitSystem.add(ring)
      rings.push(ring)
    })

    const segmentedRings = []
    for (let index = 0; index < 30; index += 1) {
      const radius = 0.68 + Math.random() * 1.58
      const arcLength = 0.16 + Math.random() * 0.82
      const start = Math.random() * Math.PI * 2

      const curve = new THREE.EllipseCurve(
        0,
        0,
        radius,
        radius,
        start,
        start + arcLength,
        false,
        0,
      )
      const points = curve
        .getPoints(32)
        .map((point) => new THREE.Vector3(point.x, point.y, 0))

      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const material = new THREE.LineBasicMaterial({
        color: index % 6 === 0 ? 0xff4d2c : 0xffa345,
        transparent: true,
        opacity: 0.22 + Math.random() * 0.46,
        blending: THREE.AdditiveBlending,
      })

      const arc = new THREE.Line(geometry, material)
      arc.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      )
      arc.userData.spin = (0.2 + Math.random() * 0.55) * (index % 2 ? 1 : -1)
      arcSystem.add(arc)
      segmentedRings.push(arc)
    }

    const spokeVertices = []
    for (let index = 0; index < 320; index += 1) {
      const radius = 0.55 + Math.random() * 1.48
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const extension = 0.04 + Math.random() * 0.23

      const start = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
      )

      const end = start
        .clone()
        .normalize()
        .multiplyScalar(radius + extension)

      spokeVertices.push(
        start.x,
        start.y,
        start.z,
        end.x,
        end.y,
        end.z,
      )
    }

    const spokeGeometry = new THREE.BufferGeometry()
    spokeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(spokeVertices, 3),
    )

    const spokeMaterial = new THREE.LineBasicMaterial({
      color: 0xff8736,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
    })

    const spokes = new THREE.LineSegments(spokeGeometry, spokeMaterial)
    shell.add(spokes)

    const innerParticles = makePointCloud(
      420,
      0.18,
      0.86,
      0xffd49a,
      0.028,
      0.92,
    )
    const orbitParticles = makePointCloud(
      1100,
      0.65,
      2.25,
      0xff8d38,
      0.018,
      0.68,
    )
    const dustParticles = makePointCloud(
      900,
      2.1,
      3.15,
      0xff5b2e,
      0.010,
      0.18,
    )

    root.add(innerParticles, orbitParticles, dustParticles)

    const nodeGroup = new THREE.Group()
    const nodes = []
    for (let index = 0; index < 10; index += 1) {
      const nodeMaterial = new THREE.MeshBasicMaterial({
        color: index % 3 === 0 ? 0xffd78b : 0xff6a31,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.025 + Math.random() * 0.022, 12, 8),
        nodeMaterial,
      )

      node.userData = {
        radius: 0.9 + Math.random() * 1.25,
        speed: 0.16 + Math.random() * 0.26,
        offset: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.7,
      }

      nodeGroup.add(node)
      nodes.push(node)
    }
    root.add(nodeGroup)

    const shockMaterial = new THREE.MeshBasicMaterial({
      color: 0xffa54d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const shockwave = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.008, 8, 180),
      shockMaterial,
    )
    shockwave.rotation.set(1.1, 0.4, 0.2)
    root.add(shockwave)

    const haloMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4e1f,
      transparent: true,
      opacity: 0.045,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 40, 28),
      haloMaterial,
    )
    root.add(halo)

    const pointer = { x: 0, y: 0 }
    const drag = {
      active: false,
      moved: false,
      x: 0,
      y: 0,
      startX: 0,
      startY: 0,
      rotX: 0,
      rotY: 0,
      targetX: 0,
      targetY: 0,
    }

    let hovered = false
    let pulse = 0
    let zoomTarget = 5.55

    function normalizedPointer(event) {
      const rect = mount.getBoundingClientRect()
      return {
        x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
        y: -((event.clientY - rect.top) / rect.height - 0.5) * 2,
      }
    }

    function onPointerEnter() {
      hovered = true
    }

    function onPointerLeave() {
      hovered = false
      drag.active = false
    }

    function onPointerDown(event) {
      drag.active = true
      drag.moved = false
      drag.startX = event.clientX
      drag.startY = event.clientY
      drag.x = event.clientX
      drag.y = event.clientY
      mount.setPointerCapture?.(event.pointerId)
    }

    function onPointerMove(event) {
      const next = normalizedPointer(event)
      pointer.x = next.x
      pointer.y = next.y

      if (!drag.active) return

      const dx = event.clientX - drag.x
      const dy = event.clientY - drag.y
      drag.x = event.clientX
      drag.y = event.clientY

      if (
        Math.abs(event.clientX - drag.startX) > 3 ||
        Math.abs(event.clientY - drag.startY) > 3
      ) {
        drag.moved = true
      }

      drag.targetY += dx * 0.006
      drag.targetX += dy * 0.006
      drag.targetX = THREE.MathUtils.clamp(drag.targetX, -0.85, 0.85)
    }

    function onPointerUp(event) {
      if (drag.active && !drag.moved) {
        pulse = 1
      }
      drag.active = false
      mount.releasePointerCapture?.(event.pointerId)
    }

    function onWheel(event) {
      event.preventDefault()
      zoomTarget += event.deltaY * 0.002
      zoomTarget = THREE.MathUtils.clamp(zoomTarget, 4.65, 6.4)
    }

    mount.addEventListener('pointerenter', onPointerEnter)
    mount.addEventListener('pointerleave', onPointerLeave)
    mount.addEventListener('pointerdown', onPointerDown)
    mount.addEventListener('pointermove', onPointerMove)
    mount.addEventListener('pointerup', onPointerUp)
    mount.addEventListener('wheel', onWheel, { passive: false })

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

      const stateSpeed =
        mode === 'PROCESSING'
          ? 2.8
          : mode === 'LISTENING'
            ? 1.7
            : mode === 'SPEAKING'
              ? 2.05
              : mode === 'ERROR'
                ? 1.25
                : 0.82

      const hoverBoost = hovered ? 1.24 : 1
      const speed = stateSpeed * hoverBoost

      drag.rotX += (drag.targetX - drag.rotX) * 0.08
      drag.rotY += (drag.targetY - drag.rotY) * 0.08

      const idleX = pointer.y * -0.06
      const idleY = pointer.x * 0.09

      root.rotation.x +=
        ((drag.active ? drag.rotX : drag.rotX + idleX) - root.rotation.x) * 0.05
      root.rotation.y +=
        ((drag.active ? drag.rotY : drag.rotY + idleY) - root.rotation.y) * 0.05

      camera.position.z += (zoomTarget - camera.position.z) * 0.08

      nucleus.rotation.x = elapsed * 0.48 * speed
      nucleus.rotation.y = elapsed * 0.69 * speed

      shell.children.forEach((child, index) => {
        if (child.userData?.spin) {
          child.rotation.y += child.userData.spin * 0.0007 * speed
          child.rotation.z +=
            Math.sin(elapsed * 0.3 + index) * 0.00012 * speed
        }
      })

      rings.forEach((ring, index) => {
        ring.rotation.z += ring.userData.spin * 0.0017 * speed
        ring.rotation.x += Math.sin(elapsed * 0.38 + index) * 0.00011
      })

      segmentedRings.forEach((arc) => {
        arc.rotation.z += arc.userData.spin * 0.0012 * speed
      })

      shell.rotation.y = elapsed * 0.026 * speed
      shell.rotation.x = Math.sin(elapsed * 0.22) * 0.07
      orbitSystem.rotation.y = -elapsed * 0.034 * speed
      arcSystem.rotation.x = elapsed * 0.019 * speed
      arcSystem.rotation.y = elapsed * -0.027 * speed

      innerParticles.rotation.y = -elapsed * 0.15 * speed
      innerParticles.rotation.x = elapsed * 0.08
      orbitParticles.rotation.y = elapsed * 0.042 * speed
      orbitParticles.rotation.x = Math.sin(elapsed * 0.12) * 0.21
      dustParticles.rotation.y = -elapsed * 0.006
      dustParticles.rotation.x = Math.sin(elapsed * 0.08) * 0.08

      nodes.forEach((node) => {
        const angle = elapsed * node.userData.speed * speed + node.userData.offset
        const radius = node.userData.radius
        node.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 0.73 + node.userData.tilt) * radius * 0.42,
          Math.sin(angle) * radius * 0.66,
        )
      })

      pulse *= 0.91
      const speakingPulse =
        mode === 'SPEAKING'
          ? (Math.sin(elapsed * 9.5) + 1) * 0.03
          : mode === 'PROCESSING'
            ? (Math.sin(elapsed * 5.4) + 1) * 0.018
            : 0

      const hoverScale = hovered ? 1.035 : 1
      nucleusGlow.scale.setScalar(
        hoverScale + pulse * 0.22 + speakingPulse,
      )
      halo.scale.setScalar(1 + pulse * 0.10 + speakingPulse * 0.55)

      shockwave.scale.setScalar(1 + pulse * 5.2)
      shockMaterial.opacity = pulse * 0.68

      const targetNucleusColor = mode === 'ERROR' ? hot : pale
      nucleusMaterial.color.lerp(targetNucleusColor, 0.08)
      orbitParticles.material.color.lerp(mode === 'ERROR' ? hot : warm, 0.07)
      innerParticles.material.color.lerp(mode === 'ERROR' ? hot : amber, 0.07)

      const intensity =
        mode === 'PROCESSING'
          ? 0.88
          : mode === 'SPEAKING'
            ? 0.80
            : hovered
              ? 0.76
              : 0.68

      orbitParticles.material.opacity +=
        (intensity - orbitParticles.material.opacity) * 0.05

      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()

      mount.removeEventListener('pointerenter', onPointerEnter)
      mount.removeEventListener('pointerleave', onPointerLeave)
      mount.removeEventListener('pointerdown', onPointerDown)
      mount.removeEventListener('pointermove', onPointerMove)
      mount.removeEventListener('pointerup', onPointerUp)
      mount.removeEventListener('wheel', onWheel)

      scene.traverse((child) => {
        child.geometry?.dispose?.()
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose?.())
        } else {
          child.material?.dispose?.()
        }
      })

      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      className="core-scene core-scene-v2"
      ref={mountRef}
      aria-label="Interactive 3D neural core. Drag to rotate, scroll to zoom, click to pulse."
      role="img"
    />
  )
}
