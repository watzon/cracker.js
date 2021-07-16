import { makeDecorator, Type, TypeDecorator } from "."
import { BotBase } from "./Bot"

export interface PluginDecorator {
    (obj?: PluginMeta): TypeDecorator

    new(obj?: PluginMeta): TypeDecorator
}

export interface PluginMeta {
    name?: string
    description?: string
    author?: string
}

export class PluginBase {
    public name?: String
    public description?: String
    public author?: String

    public static __callbacks__: Map<Function, ((bot: BotBase) => void)[]> = new Map()
    private _bot: BotBase

    constructor(bot: BotBase) {
        this._bot = bot
        // this.name = name
        // this.description = description
        // this.author = author
    }

    public get bot() {
        return this._bot
    }

    public __register__() {
        for (const callback of PluginBase.__callbacks__.get(this.constructor)) {
            callback(this.bot)
        }
    }

    public static __register__(plugin: any, callback: any) {
        if (!PluginBase.__callbacks__.has(plugin)) {
            PluginBase.__callbacks__.set(plugin, [])
        }

        PluginBase.__callbacks__.get(plugin).push(callback)
    }
}

export class PluginCallback {
    private _pluginCls: object
    private _callback: () => any
}

export const Plugin: PluginDecorator = makeDecorator(
    'Plugin', (p: PluginMeta = {}) => {}, PluginBase, undefined,
    (type: Type<any>, meta: PluginMeta) => {}
)
