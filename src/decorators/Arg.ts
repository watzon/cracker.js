import { makeParamDecorator } from ".";
import { ParsableType } from "../types/extendedTypes";

interface ArgDecorator {
    (name: string, args?: ArgMeta): any;

    new(name: string, args?: ArgMeta): ArgMeta;
}

export interface ArgMeta {
    type?: ParsableType<any>
    required?: boolean
    description?: string
}

export const Arg: ArgDecorator = makeParamDecorator(
    'Arg', (name: string, args?: ArgMeta) => ({ name, args: { type: args.type || String, required: !!args.required } })
);
