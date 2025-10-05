/**
 * Type fix for react-icons compatibility with React 19
 * React Icons returns ReactNode but React 19 expects ReactElement for JSX
 */

declare module 'react-icons/fa' {
  import { FC, SVGProps } from 'react';

  export const FaStar: FC<SVGProps<SVGSVGElement>>;
  export const FaStarHalfAlt: FC<SVGProps<SVGSVGElement>>;
  export const FaRegStar: FC<SVGProps<SVGSVGElement>>;
  export const FaThumbsUp: FC<SVGProps<SVGSVGElement>>;
  export const FaTimes: FC<SVGProps<SVGSVGElement>>;
  export const FaMedal: FC<SVGProps<SVGSVGElement>>;
  export const FaTrophy: FC<SVGProps<SVGSVGElement>>;
  export const FaAward: FC<SVGProps<SVGSVGElement>>;
  export const FaGem: FC<SVGProps<SVGSVGElement>>;
  export const FaCrown: FC<SVGProps<SVGSVGElement>>;
  export const FaSeedling: FC<SVGProps<SVGSVGElement>>;
  export const FaUser: FC<SVGProps<SVGSVGElement>>;
  export const FaUserPlus: FC<SVGProps<SVGSVGElement>>;
  export const FaUserShield: FC<SVGProps<SVGSVGElement>>;
  export const FaUserGraduate: FC<SVGProps<SVGSVGElement>>;
}

declare module 'react-icons/gi' {
  import { FC, SVGProps } from 'react';

  export const GiCrystalShine: FC<SVGProps<SVGSVGElement>>;
}

declare module 'react-icons/io5' {
  import { FC, SVGProps } from 'react';

  export const IoShieldCheckmark: FC<SVGProps<SVGSVGElement>>;
}

declare module 'react-icons/fa6' {
  import { FC, SVGProps } from 'react';

  export const FaMapPin: FC<SVGProps<SVGSVGElement>>;
  export const FaXmark: FC<SVGProps<SVGSVGElement>>;
  export const FaMagnifyingGlass: FC<SVGProps<SVGSVGElement>>;
  export const FaLock: FC<SVGProps<SVGSVGElement>>;
  export const FaEye: FC<SVGProps<SVGSVGElement>>;
  export const FaEyeSlash: FC<SVGProps<SVGSVGElement>>;
  export const FaUser: FC<SVGProps<SVGSVGElement>>;
}
