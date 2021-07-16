import { TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { makePropDecorator, ParamDecoratorFactory } from ".";
import { BotBase } from "./Bot";
import { OnMessageMeta } from "./OnMessage";
import { PluginBase } from "./Plugin";

import StringScanner from 'stringscan'
import { ArgMeta } from "./Arg";

export interface CommandDecorator {
    (obj: CommandMeta): any

    new(obj: CommandMeta): CommandMeta;
}

export interface CommandMeta extends Omit<OnMessageMeta, 'pattern'> {
    name: string
    aliases?: string[]
    prefix?: string
}

export interface CommandParams {
    bot: BotBase
    client: TelegramClient
    event: NewMessageEvent
    text: string
}

function parseArguments<T>(args: ParamDecoratorFactory<ArgMeta>[], text: string, payload: T & { text: string }) {
    let payloadPassed = false
    const params = []
    const passedArgs = {}

    if (text) {
        const scanner = new StringScanner(text)
        while (!scanner.eos()) {
            scanner.skipUntil(/\S/)
            scanner.offset -= 1
            const nextChar = scanner.peek(1)
            if (nextChar === '!' || nextChar === '.') {
                const bool = scanner.take(1) === '.'
                const key = scanner.scan(/\S+/)

                if (!key || key.length > 0) {
                    passedArgs[key] = bool
                }
            } else if (scanner.check(/(\S+):(\S+)/)) {
                const key = scanner.scanUntil(/:/).slice(0, -1)
                let value
                if (scanner.peek(1) === '"' || scanner.peek(1) === "'") {
                    const quote = scanner.take(1)
                    value = scanner.scan(new RegExp(`${quote}([^${quote}\\]|\\.)*${quote}`))
                } else {
                    value = scanner.scan(/\S+/)
                }

                if (key && value) {
                    passedArgs[key] = value
                }
            } else {
                break            
            }
        }

        payload.text = scanner.rest.trim()
    }

    for (let [index, arg] of args.entries()) {
        if (arg === null) {
            if (payloadPassed) {
                throw new Error(`Uknown property at index ${index}`)
            } else {
                params.push(payload)
                payloadPassed = true
            }
        } else {
            const passed = passedArgs[arg.name]
            if (passed !== undefined) {
                const parsedValue = arg.args.type.fromString(passed)
                params.push(parsedValue)
            } else if (arg.args.required) {
                throw new Error(`Required argument ${arg.name} not passed`)
            } else {
                params.push(undefined)
            }
        }
    }

    return params
}

export const Command: CommandDecorator = makePropDecorator(
    'Command', undefined, undefined,
    (target: PluginBase, func: string, meta: CommandMeta) => {
        let {name, aliases, outgoing, prefix, ...rest}: CommandMeta = meta
        let args = (target as any).__parameters__?.[func] || [null]
        
        aliases = aliases ? aliases : []
        aliases.unshift(name)

        outgoing = outgoing === undefined ? false : outgoing

        const pattern = new RegExp(`^\\${prefix || '.'}(?:${aliases.join('|')})(?:(\\s+([\\s\\S]*))|$)`, 'm')
        const event = new NewMessage({ pattern, outgoing, ...rest })
        const callback = (bot: BotBase) => {
            const client = bot.client
            bot.client.addEventHandler((event: NewMessageEvent) => {
                const text = event.message.patternMatch?.[1] || ''
                const _args = parseArguments<CommandParams>(args, text, {bot, client, event, text})
                target[func](..._args)
            }, new NewMessage({ pattern, outgoing, ...rest }))
        }

        PluginBase.__register__(target.constructor, callback)
    }
)

