export interface ParsableType<T> {
    fromString(str: string): T
}

declare global {
    interface StringConstructor extends ParsableType<string> {}
    interface NumberConstructor extends ParsableType<number> {}
    interface BooleanConstructor extends ParsableType<boolean> {}
    interface ArrayConstructor extends ParsableType<string[]> {}
}