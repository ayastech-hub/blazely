import React, { useEffect, useState } from "react";
import { useMotionValue, useSpring } from "framer-motion";

export default function AnimatedNumber({ value, format }) {
  const mv = useMotionValue(value);
  const spring = useSpring(mv, { stiffness: 60, damping: 20 });
  const [display, setDisplay] = useState(format(value));

  useEffect(() => {
    mv.set(value);
  }, [value, mv]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(format(v)));
    return unsub;
  }, [spring, format]);

  return <>{display}</>;
}
