

export const filterPoliceStation = (data: any[], co: string, ps: string) => {
    const filteredData = data.filter((item) => item.policeStation === ps && item.co === co)
    return filteredData

}   