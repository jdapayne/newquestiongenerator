import Options from 'Options'

export default interface ViewOptions {
    width?: number,  // any use of ViewOptions will always bubble up to GraphicQView, which assigns defaults
    height?: number,
    rotation?: number
}
