import { useParams } from 'next/navigation'

const page = () => {
    const { id } = useParams()
    return (
        <div>page</div>
    )
}

export default page