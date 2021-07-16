String.fromString = function(str: string) {
    return str
}

Number.fromString = function(str: string) {
    return Number(str)
}

Boolean.fromString = function(str: string) {
    return Boolean(str)
}

Array.fromString = function(str: string) {
    return str.split(',')
}