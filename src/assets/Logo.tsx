import logo from "@/assets/logo.png"
import Image from 'next/image'

interface LogoProps {
    width: number | `${number}` | undefined
    height: number | `${number}` | undefined
}
const Logo = ({ width, height }: LogoProps) => {
    return (
        <Image width={width} height={height} src={logo} alt='No image' />
    )
}

export default Logo