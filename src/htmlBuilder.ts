export interface ToMdOptions {
    version?: number
    escape?: boolean
}

const ToMdDefaults = {version: 2, escape: false}

export abstract class FormattedBase {
    public abstract toMd({version, escape}: ToMdOptions): string

    public abstract toHtml(): string
}

export abstract class FormattedPrimitive extends FormattedBase {
    public token: FormattedBase | any

    constructor(token: FormattedBase | any) {
        super()
        this.token = token
    }

    protected tokenOrMd(toMdOptions = ToMdDefaults) {
        return this.token instanceof FormattedBase
            ? this.token.toMd(toMdOptions)
            : String(this.token || '')
    }

    protected tokenOrHtml() {
        return this.token instanceof FormattedBase
            ? this.token.toHtml()
            : String(this.token || '')
    }

    protected escapeMd(version: number, str: FormattedBase | any | undefined) {
        if (str)
            return typeof this.token === 'string' ? this.token : this.token.toMd({ version, escape: true })
        return this.tokenOrMd({ version, escape: true })
    }
}

export class BasicString extends FormattedPrimitive {
    constructor(token: FormattedBase | any) {
        super(token)
    }
    
    public toMd(toMdOptions = ToMdDefaults) {
        return this.tokenOrMd(toMdOptions)
    }
    
    public toHtml() {
        return this.tokenOrHtml()
    }
}

export class Bold extends FormattedPrimitive {
    constructor(token: FormattedBase | any) {
        super(token)
    }

    public toMd(toMdOptions = ToMdDefaults) {
        return `*${this.tokenOrMd(toMdOptions)}*`
    }

    public toHtml() {
        return `<b>${this.tokenOrHtml()}</b>`
    }
}

export class Italic extends FormattedPrimitive {
    constructor(token: FormattedBase | any) {
        super(token)
    }

    public toMd(toMdOptions = ToMdDefaults) {
        return `_${this.tokenOrMd(toMdOptions)}_`
    }

    public toHtml() {
        return `<i>${this.tokenOrHtml()}</i>`
    }
}

export class Underline extends FormattedPrimitive {
    constructor(token: FormattedBase | any) {
        super(token)
    }

    public toMd(toMdOptions = ToMdDefaults) {
        if (toMdOptions.version !== 2)
            console.warn(`Underlines aren't supported in legacy markdown`)
        return `__${this.tokenOrMd(toMdOptions)}__`
    }

    public toHtml() {
        return `<u>${this.tokenOrHtml()}</u>`
    }
}

export class Strikethrough extends FormattedPrimitive {
    constructor(token: FormattedBase | any) {
        super(token)
    }

    public toMd(toMdOptions = ToMdDefaults) {
        if (toMdOptions.version !== 2)
            console.warn(`Strikethroughs aren't supported in legacy markdown`)
        return `__${this.tokenOrMd(toMdOptions)}__`
    }

    public toHtml() {
        return `<u>${this.tokenOrHtml()}</u>`
    }
}

export class Link extends FormattedPrimitive {
    public url: string

    constructor(text: FormattedBase | any, url: string) {
        super(text)
        this.url = url
    }

    public toMd(toMdOptions = ToMdDefaults) {
        const url = toMdOptions.escape ? this.escapeMd(toMdOptions.version, this.url) : this.url
        return `[${this.tokenOrMd(toMdOptions)}](${url})`
    }

    public toHtml() {
        return `<a href="${this.url}">${this.tokenOrHtml()}</a>`
    }
}

export class Mention extends FormattedPrimitive {
    public userId: number

    constructor(text: string, userId: number) {
        super(text)
        this.userId = userId
    }

    public toMd(toMdOptions = ToMdDefaults) {
        return `[${this.tokenOrMd(toMdOptions)}](tg://user?id=${this.userId})`
    }

    public toHtml() {
        return `<a href="tg://user?id=${this.userId}">${this.tokenOrHtml()}</a>`
    }
}

export class Code extends FormattedPrimitive {
    constructor(token: FormattedBase | any) {
        super(token)
    }

    public toMd(toMdOptions = ToMdDefaults) {
        return `\`${this.tokenOrMd(toMdOptions)}\``
    }

    public toHtml() {
        return `<code>${this.tokenOrHtml()}</code>`
    }
}

export class CodeBlock extends FormattedPrimitive {
    public language: string

    constructor(token: FormattedBase | any, language?: string) {
        super(token)
        this.language = language
    }

    public toMd(toMdOptions = ToMdDefaults) {
        return `\`\`\`${this.language ? this.language : ''}\n${this.tokenOrMd(toMdOptions)}\n\`\`\``
    }

    public toHtml() {
        return '<pre><code'
            + (this.language ? ` language="${this.language}">` : '>')
            + this.tokenOrHtml()
            + '</code></pre>'
    }
}

export class KeyValueItem extends FormattedBase {
    public key: FormattedBase
    public value: FormattedBase

    constructor(key: FormattedBase | any, value: FormattedBase | any) {
        super()
        this.key = typeof key === 'string' ? new BasicString(key) : key
        this.value = typeof value === 'string' ? new BasicString(value) : value
    }

    public toMd(toMdOptions = ToMdDefaults) {
        return `${this.key.toMd(toMdOptions)}: ${this.value.toMd(toMdOptions)}`
    }

    public toHtml() {
        return `${this.key.toHtml()}: ${this.value.toHtml()}`
    }
}

export interface SectionOptions {
    indent?: number
    spacing?: number
    title?: boolean
}

const SectionDefaults = {
    indent: 4,
    spacing: 1,
    title: true,
}

export class Section extends FormattedBase {
    public tokens: Array<FormattedBase>
    public indent: number
    public spacing: number
    public title: boolean

    constructor(tokens: Array<FormattedBase | any> = [], {indent, spacing, title}: SectionOptions = SectionDefaults) {
        super()
        this.tokens = (tokens || []).map(t => typeof t === 'string' ? new BasicString(t) : t)
        this.indent = indent
        this.spacing = spacing
        this.title = title
    }

    public add(token: FormattedBase | any) {
        const normalized = typeof token === 'string' ? new BasicString(token) : token
        this.tokens.push(normalized)
        return normalized
    }

    public toMd(toMdOptions: ToMdOptions = ToMdDefaults) {
        const buffer = []
        let indent = 0
        for (const [index, token] of this.tokens.entries()) {
            if (this.title && index === 0) {
                buffer.push(token.toMd(toMdOptions))
                indent += this.indent
                continue
            }

            let line = ' '.repeat(indent) + token.toMd(toMdOptions)
            buffer.push(line)
        }
        return buffer.join('\n'.repeat(this.spacing))
    }

    public toHtml() {
        const buffer = []
        let indent = 0
        for (const [index, token] of this.tokens.entries()) {
            if (this.title && index === 0) {
                buffer.push(token.toHtml())
                indent += this.indent
                continue
            }

            let line = ' '.repeat(indent) + token.toHtml()
            buffer.push(line)
        }
        return buffer.join('\n'.repeat(this.spacing))
    }
}

const SubSectionDefaults = {
    indent: 8,
    spacing: 1,
    title: true,
}

export class SubSection extends Section {
    constructor(tokens: Array<FormattedBase | any>, options: SectionOptions = SubSectionDefaults) {
        super(tokens, options)
    }
}

const SubSubSectionDefaults = {
    indent: 12,
    spacing: 1,
    title: true,
}

export class SubSubSection extends Section {
    constructor(tokens: Array<FormattedBase | any>, options: SectionOptions = SubSubSectionDefaults) {
        super(tokens, options)
    }
}