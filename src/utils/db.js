export async function withTransaction(pool, callback) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const tx = {
            query: async (sql, params = []) => {
                const [rows] = await connection.execute(sql, params);
                return rows;
            },
            queryOne: async (sql, params = []) => {
                const [rows] = await connection.execute(sql, params);
                return rows[0] || null;
            },
            execute: async (sql, params = []) => {
                const [result] = await connection.execute(sql, params);
                return result;
            },
            connection
        };
        const result = await callback(tx);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback().catch(() => null);
        throw error;
    } finally {
        connection.release();
    }
}
