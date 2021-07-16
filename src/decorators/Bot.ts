import { performance } from 'perf_hooks'
import prompts from 'prompts';
import { TelegramClient } from 'telegram';
import { ParseInterface } from 'telegram/client/messageParse';
import { TelegramClientParams } from 'telegram/client/telegramBaseClient';
import { Session, StringSession } from 'telegram/sessions';
import { makeDecorator, Type, TypeDecorator } from '.';
import { PluginBase } from './Plugin';

export interface BotDecorator {
    (obj: BotMeta): TypeDecorator;

    new(obj: BotMeta): TypeDecorator;
}

export interface BotMeta {
    apiId: number
    apiHash: string
    clientParams?: TelegramClientParams
    session?: Session | string
    plugins?: any[]
    autostart?: boolean
    parseMode?: ParseInterface | 'md' | 'markdown' | 'html' | undefined
}

export interface Authenticatable {
    phoneNumber?: () => string
    password?: () => string
    phoneCode?: () => number
    onError?: (error: Error) => void | Promise<boolean>
}

export class BotBase {
    private _client: TelegramClient
    private _startTime: number

    public plugins: Map<typeof PluginBase, PluginBase> = new Map()

    public init() {
        this._startTime = performance.now()
    }

    public get uptime() {
        return performance.now() - this._startTime
    }

    public get client() {
        if (!this._client)
            throw new Error(`Bot client has not been set. This shouldn't happen.`)
        return this._client!
    }

    public set client(client: TelegramClient) {
        this._client = client
    }

    addPlugin(plugin: typeof PluginBase) {
        const plug = new plugin(this)
        plug.__register__()
        this.plugins.set(plugin, plug)
    }

    removePlugin(plugin: typeof PluginBase) {
        const plug = this.plugins.get(plugin)
        this.plugins.delete(plugin)
    }

    async start() {
        console.log('Starting bot server...')

        await this.client.start({
            phoneNumber: this.phoneNumber,
            password: this.password,
            phoneCode: this.phoneCode,
            onError: this.onError,
        })

        console.log("Connected to Telegram!")
    }

    async stop() {
        await this.client.disconnect()
    }

    async phoneNumber() {
        return await (await prompts({ type: 'text', name: 'phone', message: 'Phone number:' })).phone
    }
    
    async password() {
        return await (await prompts({ type: 'text', name: 'pass', message: 'Password:' })).pass
    }
    
    async phoneCode() {
        return await (await prompts({ type: 'text', name: 'code', message: 'Code:' })).code
    }
    
    async onError(err: Error) {
        console.error(err)
        return true
    }
}

export const Bot: BotDecorator = makeDecorator(
    'Bot',
    (meta: BotMeta) => ({
        session: !meta.session || typeof meta.session === 'string'
                 ? new StringSession(meta.session as string)
                 : meta.session,
        plugins: meta.plugins || [],
        autostart: meta.autostart,
        ...meta
    }),
    undefined, undefined,
    async (type: Type<any>, meta: BotMeta) => {        
        const superClass = class type extends BotBase {}

        const client = new TelegramClient(meta.session as Session, meta.apiId, meta.apiHash, meta.clientParams || {})
        if (meta.parseMode) client.setParseMode(meta.parseMode)
        
        const bot = new superClass()
        bot.init()
        bot.client = client

        for (const plugin of meta.plugins as Array<typeof PluginBase>) {
            bot.addPlugin(plugin)
        }

        if (meta.autostart || meta.autostart === undefined) {
            await bot.start()
        }
    }
)
