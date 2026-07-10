import { createGenericJsonProvider } from './genericJsonProvider.js';
import { createFormPostProvider } from './formPostProvider.js';
import { createExampleProvider } from './exampleProvider.js';

export function getSMSAdapter(provider = process.env.SMS_PROVIDER || 'generic_json', env = process.env) {
    const adapters = {
        generic_json: createGenericJsonProvider(env),
        form_post: createFormPostProvider(env),
        example_provider: createExampleProvider(env)
    };
    return adapters[provider] || adapters.generic_json;
}

export function listSMSProviderContracts(env = process.env) {
    return [createGenericJsonProvider(env), createFormPostProvider(env), createExampleProvider(env)]
        .map(adapter => ({ name: adapter.name, contract: adapter.contract }));
}
