function redact(value) {
    if (value == null) return value;
    if (typeof value === 'string') {
        return value
            .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
            .replace(/(api[_-]?key|token|password|secret)["'\s:=]+[^\s"'}]+/gi, '$1=[redacted]')
            .slice(0, 4000);
    }
    if (Array.isArray(value)) return value.slice(0, 50).map(redact);
    if (typeof value === 'object') {
        const out = {};
        for (const [key, item] of Object.entries(value)) {
            if (/password|token|secret|api[_-]?key|authorization/i.test(key)) out[key] = '[redacted]';
            else out[key] = redact(item);
        }
        return out;
    }
    return value;
}

function write(level, event, meta = {}) {
    const payload = {
        ts: new Date().toISOString(),
        level,
        event,
        ...redact(meta)
    };
    const line = JSON.stringify(payload);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
}

export function logInfo(event, meta = {}) { write('info', event, meta); }
export function logWarn(event, meta = {}) { write('warn', event, meta); }
export function logError(event, error, meta = {}) {
    write('error', event, {
        ...meta,
        error_code: classifyError(error),
        message: error?.message || String(error || 'unknown')
    });
}

export function classifyError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    if (error?.name === 'AbortError' || message.includes('timeout')) return 'TIMEOUT';
    if (message.includes('duplicate')) return 'DUPLICATE';
    if (message.includes('foreign key')) return 'FK_CONSTRAINT';
    if (message.includes('access denied') || message.includes('permission')) return 'AUTHZ_DENIED';
    if (message.includes('jwt') || message.includes('token')) return 'AUTH_INVALID';
    if (message.includes('sql') || message.includes('mysql')) return 'DB_ERROR';
    if (message.includes('fetch') || message.includes('network')) return 'NETWORK_ERROR';
    return 'UNCLASSIFIED';
}

export default { logInfo, logWarn, logError, classifyError };
