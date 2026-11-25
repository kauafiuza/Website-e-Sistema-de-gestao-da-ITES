import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react"
import type { BlockProps } from "../types"

const widthPresets: Record<Exclude<NonNullable<BlockProps["layoutWidth"]>, "full" | "custom">, number> = {
  wide: 1440,
  standard: 1120,
  narrow: 760,
}

export function blockFrameStyle(props: BlockProps): CSSProperties {
  const width = props.layoutWidth ?? "full"
  const maxWidth = width === "custom"
    ? Math.min(2400, Math.max(320, props.layoutMaxWidth ?? 1120))
    : width === "full" ? undefined : widthPresets[width]
  const gutter = Math.min(128, Math.max(0, props.layoutGutter ?? 0))

  return {
    width: `calc(100% - ${gutter * 2}px)`,
    maxWidth: maxWidth ? `${maxWidth}px` : "none",
    marginInline: "auto",
  }
}

export function blockBackgroundStyle(props: BlockProps): CSSProperties {
  const buttonStyle = props.buttonStyle ?? "theme"
  const buttonColor = props.buttonColor
  const buttonTextColor = props.buttonTextColor
  const accentColor = props.accentColor
  const customization: CSSProperties = {
    "--builder-button-color": buttonColor,
    "--builder-button-text-color": buttonTextColor,
    "--primary": accentColor,
    "--ring": accentColor,
  } as CSSProperties
  if (props.backgroundMode === "solid") {
    const color = props.backgroundColor ?? "var(--background)"
    return { ...customization, "--builder-button-style": buttonStyle, "--background": color, backgroundColor: color } as CSSProperties
  }
  if (props.backgroundMode === "gradient") {
    const from = props.backgroundGradientFrom ?? "var(--accent)"
    const via = props.backgroundGradientVia ?? from
    const to = props.backgroundGradientTo ?? "var(--primary)"
    const angle = Math.min(360, Math.max(0, props.backgroundGradientAngle ?? 125))
    return {
      ...customization,
      "--builder-button-style": buttonStyle,
      "--background": "transparent",
      backgroundColor: "transparent",
      backgroundImage: `linear-gradient(${angle}deg, ${from} 0%, ${via} 50%, ${to} 100%)`,
    } as CSSProperties
  }
  return { ...customization, "--builder-button-style": buttonStyle } as CSSProperties
}

export function BlockFrame({
  props,
  children,
  className,
  id,
  dataBlockId,
  animate = true,
}: {
  props: BlockProps
  children: ReactNode
  className?: string
  id?: string
  dataBlockId?: string
  animate?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const animation = animate ? props.blockAnimation ?? "none" : "none"
  const [visible, setVisible] = useState(animation === "none")

  useEffect(() => {
    const element = ref.current
    if (!element || animation === "none") return
    let frame = 0
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    }
    frame = requestAnimationFrame(() => setVisible(false))
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      cancelAnimationFrame(frame)
      setVisible(true)
      observer.disconnect()
    }, { threshold: 0.12 })
    observer.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [animation])

  return (
    <div
      ref={ref}
      id={id}
      data-block-id={dataBlockId}
      data-block-animation={animation === "none" ? undefined : animation}
      data-block-button-style={props.buttonStyle && props.buttonStyle !== "theme" ? props.buttonStyle : undefined}
      data-block-custom-button-bg={props.buttonColor ? "true" : undefined}
      data-block-custom-button-text={props.buttonTextColor ? "true" : undefined}
      data-visible={visible ? "true" : "false"}
      className={className ? `builder-block-frame ${className}` : "builder-block-frame"}
      style={{ ...blockFrameStyle(props), ...blockBackgroundStyle(props) }}
    >
      {children}
    </div>
  )
}
