import { motion } from 'motion/react';
import characterImg from '../assets/xiaoxin.png';

export function Character({ x, y, moving }: { x: number; y: number; moving: boolean }) {
  return (
    <motion.g
      animate={{ x, y }}
      transition={{ duration: moving ? 1.15 : 0.35, ease: [0.22, 0.8, 0.25, 1] }}
      className="travellers"
      aria-label="蜡笔小新在地图上旅行"
    >
      {/* 影子 */}
      <ellipse cx="0" cy="20" rx="30" ry="4" className="character-shadow" />

      {/* 角色图片 */}
      <image
        href={characterImg}
        x="-42"
        y="-55"
        width="84"
        height="47"
        preserveAspectRatio="xMidYMid meet"
      />
    </motion.g>
  );
}
