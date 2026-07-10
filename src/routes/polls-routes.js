// Professional polls and voting routes
export default function registerPollRoutes(app, pool, authenticateToken, requireAdmin, services = {}) {
  const saveBase64Image = services.saveBase64Image;
  const validateImage = services.validateImage;
  const allowedRoles = ['student', 'teacher', 'parent', 'executive_assistant', 'educational_assistant'];
  const allowedStatuses = ['draft', 'active', 'closed'];
  const allowedVisibility = ['always', 'after_vote', 'after_close', 'admin_only'];


  // سازگاری خودکار با نسخه‌های قبلی دیتابیس. این migration به‌صورت lazy اجرا می‌شود
  // تا حتی اگر سرور قبل از پایان createTables درخواست دریافت کرد، صفحه رأی‌گیری 500 ندهد.
  let pollSchemaReady = null;

  async function columnExists(table, column) {
    const [rows] = await pool.query(`
      SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `, [table, column]);
    return Number(rows?.[0]?.count || 0) > 0;
  }

  async function indexExists(table, indexName) {
    const [rows] = await pool.query(`
      SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
    `, [table, indexName]);
    return Number(rows?.[0]?.count || 0) > 0;
  }

  async function addColumn(table, column, definition) {
    if (!(await columnExists(table, column))) {
      await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
      console.log(`✅ poll migration: ${table}.${column}`);
    }
  }

  async function ensurePollSchemaNow() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(160) NULL,
        description TEXT NULL,
        cover_image_url TEXT NULL,
        audience VARCHAR(255) NOT NULL DEFAULT 'student,teacher,parent',
        allow_multiple TINYINT(1) NOT NULL DEFAULT 0,
        max_choices INT NOT NULL DEFAULT 1,
        is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
        results_visibility VARCHAR(30) NOT NULL DEFAULT 'after_vote',
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        starts_at DATETIME NULL,
        ends_at DATETIME NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci
    `);

    // تمام ستون‌هایی که نسخه حرفه‌ای صفحه استفاده می‌کند.
    await addColumn('polls', 'title', 'VARCHAR(160) NULL');
    await addColumn('polls', 'description', 'TEXT NULL');
    await addColumn('polls', 'cover_image_url', 'TEXT NULL');
    await addColumn('polls', 'audience', "VARCHAR(255) NOT NULL DEFAULT 'student,teacher,parent'");
    await addColumn('polls', 'allow_multiple', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumn('polls', 'max_choices', 'INT NOT NULL DEFAULT 1');
    await addColumn('polls', 'is_anonymous', 'TINYINT(1) NOT NULL DEFAULT 0');
    await addColumn('polls', 'results_visibility', "VARCHAR(30) NOT NULL DEFAULT 'after_vote'");
    await addColumn('polls', 'status', "VARCHAR(20) NOT NULL DEFAULT 'draft'");
    await addColumn('polls', 'starts_at', 'DATETIME NULL');
    await addColumn('polls', 'ends_at', 'DATETIME NULL');
    await addColumn('polls', 'created_by', 'INT NULL');
    await addColumn('polls', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    await addColumn('polls', 'updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    // ENUMهای نسخه‌های قدیمی ممکن است مقادیر جدید را نپذیرند. VARCHAR سازگاری کامل دارد.
    await pool.query(`ALTER TABLE polls MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft'`);
    await pool.query(`ALTER TABLE polls MODIFY COLUMN results_visibility VARCHAR(30) NOT NULL DEFAULT 'after_vote'`);

    // تبدیل امن داده‌های احتمالی جدول قدیمی.
    if (await columnExists('polls', 'question')) {
      await pool.query(`UPDATE polls SET title = COALESCE(NULLIF(title,''), question) WHERE title IS NULL OR title=''`);
    }
    if (await columnExists('polls', 'target_roles')) {
      await pool.query(`UPDATE polls SET audience = target_roles WHERE (audience IS NULL OR audience='') AND target_roles IS NOT NULL`);
    }
    if (await columnExists('polls', 'is_active')) {
      await pool.query(`UPDATE polls SET status = CASE WHEN is_active=1 THEN 'active' ELSE 'draft' END WHERE status IS NULL OR status=''`);
    }
    await pool.query(`UPDATE polls SET title=CONCAT('رأی‌گیری شماره ', id) WHERE title IS NULL OR TRIM(title)=''`);
    await pool.query(`UPDATE polls SET audience='student,teacher,parent' WHERE audience IS NULL OR TRIM(audience)=''`);
    await pool.query(`UPDATE polls SET status='draft' WHERE status IS NULL OR status NOT IN ('draft','active','closed')`);
    await pool.query(`UPDATE polls SET results_visibility='after_vote' WHERE results_visibility IS NULL OR results_visibility NOT IN ('always','after_vote','after_close','admin_only')`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        poll_id INT NOT NULL,
        option_text VARCHAR(250) NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_poll_option (poll_id, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci
    `);
    await addColumn('poll_options', 'poll_id', 'INT NOT NULL');
    await addColumn('poll_options', 'option_text', 'VARCHAR(250) NULL');
    await addColumn('poll_options', 'sort_order', 'INT NOT NULL DEFAULT 0');
    await addColumn('poll_options', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    if (await columnExists('poll_options', 'text')) {
      await pool.query(`UPDATE poll_options SET option_text = \`text\` WHERE option_text IS NULL OR option_text=''`);
    }
    if (await columnExists('poll_options', 'title')) {
      await pool.query(`UPDATE poll_options SET option_text = title WHERE option_text IS NULL OR option_text=''`);
    }
    await pool.query(`UPDATE poll_options SET option_text=CONCAT('گزینه ', id) WHERE option_text IS NULL OR TRIM(option_text)=''`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        poll_id INT NOT NULL,
        option_id INT NOT NULL,
        user_id INT NULL,
        voter_role VARCHAR(50) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_poll_voter (poll_id, user_id),
        INDEX idx_poll_vote_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_persian_ci
    `);
    await addColumn('poll_votes', 'poll_id', 'INT NOT NULL');
    await addColumn('poll_votes', 'option_id', 'INT NOT NULL');
    await addColumn('poll_votes', 'user_id', 'INT NULL');
    await addColumn('poll_votes', 'voter_role', 'VARCHAR(50) NULL');
    await addColumn('poll_votes', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    if (await columnExists('poll_votes', 'voter_id')) {
      await pool.query(`UPDATE poll_votes SET user_id=voter_id WHERE user_id IS NULL`);
    }
    // voter_role در داده‌های قدیمی ممکن است خالی باشد؛ نقش از users بازسازی می‌شود.
    await pool.query(`
      UPDATE poll_votes pv LEFT JOIN users u ON u.id=pv.user_id
      SET pv.voter_role=COALESCE(NULLIF(pv.voter_role,''), u.role, 'student')
      WHERE pv.voter_role IS NULL OR pv.voter_role=''
    `);

    if (!(await indexExists('poll_options', 'idx_poll_option'))) {
      await pool.query(`ALTER TABLE poll_options ADD INDEX idx_poll_option (poll_id, sort_order)`);
    }
    if (!(await indexExists('poll_votes', 'idx_poll_voter'))) {
      await pool.query(`ALTER TABLE poll_votes ADD INDEX idx_poll_voter (poll_id, user_id)`);
    }
  }

  async function ensurePollSchema(req, res, next) {
    try {
      if (!pollSchemaReady) {
        pollSchemaReady = ensurePollSchemaNow().catch(error => {
          pollSchemaReady = null;
          throw error;
        });
      }
      await pollSchemaReady;
      next();
    } catch (error) {
      console.error('Poll schema migration failed:', error);
      res.status(500).json({ success: false, error: 'خطا در آماده‌سازی دیتابیس رأی‌گیری', details: error.message });
    }
  }

  app.use('/api/v1/admin/polls', ensurePollSchema);
  app.use('/api/v1/polls', ensurePollSchema);

  const normalizeAudience = value => {
    const values = (Array.isArray(value) ? value : String(value || '').split(','))
      .map(item => String(item).trim()).filter(item => allowedRoles.includes(item));
    return [...new Set(values)];
  };

  const normalizeOptions = value => {
    if (!Array.isArray(value)) return [];
    return value.map((option, index) => {
      if (typeof option === 'string') return { id: null, text: option.trim(), sort_order: index + 1 };
      return {
        id: option?.id ? Number(option.id) : null,
        text: String(option?.text ?? option?.option_text ?? '').trim(),
        sort_order: index + 1
      };
    }).filter(option => option.text);
  };

  function validatePollPayload(body) {
    const title = String(body?.title || '').trim();
    const description = String(body?.description || '').trim();
    const audience = normalizeAudience(body?.audience);
    const options = normalizeOptions(body?.options);
    const status = allowedStatuses.includes(body?.status) ? body.status : 'draft';
    const resultsVisibility = allowedVisibility.includes(body?.results_visibility) ? body.results_visibility : 'after_vote';
    const allowMultiple = body?.allow_multiple ? 1 : 0;
    const maxChoices = allowMultiple ? Number(body?.max_choices || 2) : 1;
    const startsAt = body?.starts_at || null;
    const endsAt = body?.ends_at || null;
    const coverImage = typeof body?.cover_image === 'string' && body.cover_image.startsWith('data:image/') ? body.cover_image : null;
    const removeCoverImage = !!body?.remove_cover_image;
    if (title.length < 3 || title.length > 160) throw new Error('عنوان رأی‌گیری باید بین ۳ تا ۱۶۰ حرف باشد');
    if (description.length > 1500) throw new Error('توضیحات رأی‌گیری بیش از حد طولانی است');
    if (!audience.length) throw new Error('حداقل یک گروه مخاطب انتخاب کنید');
    if (options.length < 2 || options.length > 12) throw new Error('تعداد گزینه‌ها باید بین ۲ تا ۱۲ باشد');
    const optionKeys = options.map(option => option.text.toLocaleLowerCase('fa'));
    if (new Set(optionKeys).size !== optionKeys.length) throw new Error('گزینه‌های تکراری مجاز نیستند');
    if (startsAt && endsAt && new Date(String(startsAt).replace(' ', 'T')) >= new Date(String(endsAt).replace(' ', 'T'))) throw new Error('زمان پایان باید بعد از زمان شروع باشد');
    if (allowMultiple && (!Number.isInteger(maxChoices) || maxChoices < 2 || maxChoices > options.length)) throw new Error('حداکثر انتخاب نامعتبر است');
    return {
      title, description: description || null, audience, options, status,
      results_visibility: resultsVisibility, allow_multiple: allowMultiple,
      max_choices: maxChoices, is_anonymous: body?.is_anonymous ? 1 : 0,
      starts_at: startsAt, ends_at: endsAt,
      cover_image: coverImage, remove_cover_image: removeCoverImage
    };
  }

  async function eligibleCount(audience, connection = pool) {
    const roles = normalizeAudience(audience);
    if (!roles.length) return 0;
    const placeholders = roles.map(() => '?').join(',');
    const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM users WHERE status='active' AND role IN (${placeholders})`, roles);
    return Number(rows?.[0]?.count || 0);
  }

  async function hydratePolls(rows, connection = pool) {
    if (!rows.length) return [];
    const ids = rows.map(row => Number(row.id));
    const placeholders = ids.map(() => '?').join(',');
    const [options] = await connection.query(`
      SELECT o.id, o.poll_id, o.option_text, o.sort_order,
             COUNT(v.id) AS votes_count
      FROM poll_options o
      LEFT JOIN poll_votes v ON v.option_id=o.id
      WHERE o.poll_id IN (${placeholders})
      GROUP BY o.id, o.poll_id, o.option_text, o.sort_order
      ORDER BY o.poll_id, o.sort_order, o.id
    `, ids);
    const [voterStats] = await connection.query(`
      SELECT poll_id, COUNT(DISTINCT user_id) AS unique_voters, COUNT(*) AS total_selections
      FROM poll_votes WHERE poll_id IN (${placeholders}) GROUP BY poll_id
    `, ids);
    const statsByPoll = Object.fromEntries(voterStats.map(row => [String(row.poll_id), row]));
    const optionsByPoll = {};
    options.forEach(option => { (optionsByPoll[String(option.poll_id)] ||= []).push(option); });
    const hydrated = [];
    for (const row of rows) {
      const stats = statsByPoll[String(row.id)] || {};
      hydrated.push({
        ...row,
        audience: normalizeAudience(row.audience),
        options: optionsByPoll[String(row.id)] || [],
        options_count: (optionsByPoll[String(row.id)] || []).length,
        unique_voters: Number(stats.unique_voters || 0),
        total_selections: Number(stats.total_selections || 0),
        total_votes: Number(stats.total_selections || 0),
        eligible_count: await eligibleCount(row.audience, connection)
      });
    }
    return hydrated;
  }

  async function refreshExpiredPolls(connection = pool) {
    await connection.query(`UPDATE polls SET status='closed' WHERE status='active' AND ends_at IS NOT NULL AND ends_at < NOW()`);
  }

  app.get('/api/v1/admin/polls', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await refreshExpiredPolls();
      const [rows] = await pool.query(`
        SELECT p.*, u.name AS created_by_name
        FROM polls p LEFT JOIN users u ON u.id=p.created_by
        ORDER BY CASE p.status WHEN 'active' THEN 1 WHEN 'draft' THEN 2 ELSE 3 END, p.created_at DESC
      `);
      res.json({ success: true, polls: await hydratePolls(rows) });
    } catch (error) {
      console.error('GET /admin/polls:', error);
      res.status(500).json({ success: false, error: 'خطا در دریافت رأی‌گیری‌ها' });
    }
  });

  app.get('/api/v1/admin/polls/:id/results', authenticateToken, requireAdmin, async (req, res) => {
    try {
      await refreshExpiredPolls();
      const [rows] = await pool.query(`SELECT p.*, u.name AS created_by_name FROM polls p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=?`, [req.params.id]);
      if (!rows.length) return res.status(404).json({ success: false, error: 'رأی‌گیری پیدا نشد' });
      const [poll] = await hydratePolls(rows);
      const [roleCounts] = await pool.query(`SELECT voter_role, COUNT(DISTINCT user_id) AS voters_count FROM poll_votes WHERE poll_id=? GROUP BY voter_role`, [req.params.id]);
      let recentVoters = [];
      if (!Number(poll.is_anonymous)) {
        const [recent] = await pool.query(`
          SELECT u.name AS voter_name, pv.voter_role, MAX(pv.created_at) AS voted_at
          FROM poll_votes pv LEFT JOIN users u ON u.id=pv.user_id
          WHERE pv.poll_id=? GROUP BY pv.user_id, u.name, pv.voter_role
          ORDER BY voted_at DESC LIMIT 20
        `, [req.params.id]);
        recentVoters = recent;
      }
      res.json({
        success: true, poll, options: poll.options,
        unique_voters: poll.unique_voters, total_selections: poll.total_selections,
        eligible_count: poll.eligible_count, role_counts: roleCounts, recent_voters: recentVoters
      });
    } catch (error) {
      console.error('GET /admin/polls/:id/results:', error);
      res.status(500).json({ success: false, error: 'خطا در دریافت نتایج رأی‌گیری' });
    }
  });

  app.post('/api/v1/admin/polls', authenticateToken, requireAdmin, async (req, res) => {
    let payload;
    try { payload = validatePollPayload(req.body); }
    catch (error) { return res.status(400).json({ success: false, error: error.message }); }
    const connection = await pool.getConnection();
    try {
      let coverImageUrl = null;
      if (payload.cover_image) {
        if (typeof validateImage === 'function') validateImage(payload.cover_image);
        coverImageUrl = typeof saveBase64Image === 'function'
          ? await saveBase64Image(payload.cover_image, 'polls')
          : payload.cover_image;
      }
      await connection.beginTransaction();
      const [result] = await connection.query(`
        INSERT INTO polls (title, description, cover_image_url, audience, allow_multiple, max_choices, is_anonymous, results_visibility, status, starts_at, ends_at, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [payload.title, payload.description, coverImageUrl, payload.audience.join(','), payload.allow_multiple, payload.max_choices, payload.is_anonymous, payload.results_visibility, payload.status, payload.starts_at, payload.ends_at, req.user?.id || null]);
      for (const option of payload.options) {
        await connection.query(`INSERT INTO poll_options (poll_id, option_text, sort_order) VALUES (?, ?, ?)`, [result.insertId, option.text, option.sort_order]);
      }
      await connection.commit();
      res.status(201).json({ success: true, id: result.insertId, message: 'رأی‌گیری ساخته شد' });
    } catch (error) {
      await connection.rollback();
      console.error('POST /admin/polls:', error);
      res.status(500).json({ success: false, error: 'خطا در ساخت رأی‌گیری' });
    } finally { connection.release(); }
  });

  app.put('/api/v1/admin/polls/:id', authenticateToken, requireAdmin, async (req, res) => {
    let payload;
    try { payload = validatePollPayload(req.body); }
    catch (error) { return res.status(400).json({ success: false, error: error.message }); }
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[poll]] = await connection.query(`SELECT id, cover_image_url FROM polls WHERE id=? FOR UPDATE`, [req.params.id]);
      if (!poll) { await connection.rollback(); return res.status(404).json({ success: false, error: 'رأی‌گیری پیدا نشد' }); }
      let coverImageUrl = payload.remove_cover_image ? null : (poll.cover_image_url || null);
      if (payload.cover_image) {
        if (typeof validateImage === 'function') validateImage(payload.cover_image);
        coverImageUrl = typeof saveBase64Image === 'function'
          ? await saveBase64Image(payload.cover_image, 'polls')
          : payload.cover_image;
      }
      await connection.query(`
        UPDATE polls SET title=?, description=?, cover_image_url=?, audience=?, allow_multiple=?, max_choices=?, is_anonymous=?, results_visibility=?, status=?, starts_at=?, ends_at=? WHERE id=?
      `, [payload.title, payload.description, coverImageUrl, payload.audience.join(','), payload.allow_multiple, payload.max_choices, payload.is_anonymous, payload.results_visibility, payload.status, payload.starts_at, payload.ends_at, req.params.id]);
      const [currentOptions] = await connection.query(`SELECT id FROM poll_options WHERE poll_id=?`, [req.params.id]);
      const currentIds = currentOptions.map(option => Number(option.id));
      const keptIds = [];
      for (const option of payload.options) {
        if (option.id && currentIds.includes(Number(option.id))) {
          keptIds.push(Number(option.id));
          await connection.query(`UPDATE poll_options SET option_text=?, sort_order=? WHERE id=? AND poll_id=?`, [option.text, option.sort_order, option.id, req.params.id]);
        } else {
          const [inserted] = await connection.query(`INSERT INTO poll_options (poll_id, option_text, sort_order) VALUES (?, ?, ?)`, [req.params.id, option.text, option.sort_order]);
          keptIds.push(Number(inserted.insertId));
        }
      }
      const removedIds = currentIds.filter(id => !keptIds.includes(id));
      for (const optionId of removedIds) {
        const [[voteCount]] = await connection.query(`SELECT COUNT(*) AS count FROM poll_votes WHERE option_id=?`, [optionId]);
        if (Number(voteCount.count || 0) > 0) {
          await connection.rollback();
          return res.status(409).json({ success: false, error: 'گزینه‌ای که رأی دارد قابل حذف نیست؛ متن آن را ویرایش کنید' });
        }
        await connection.query(`DELETE FROM poll_options WHERE id=?`, [optionId]);
      }
      await connection.commit();
      res.json({ success: true, message: 'رأی‌گیری ویرایش شد' });
    } catch (error) {
      await connection.rollback();
      console.error('PUT /admin/polls/:id:', error);
      res.status(500).json({ success: false, error: 'خطا در ویرایش رأی‌گیری' });
    } finally { connection.release(); }
  });

  app.patch('/api/v1/admin/polls/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const status = allowedStatuses.includes(req.body?.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ success: false, error: 'وضعیت نامعتبر است' });
    try {
      const [result] = await pool.query(`UPDATE polls SET status=? WHERE id=?`, [status, req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ success: false, error: 'رأی‌گیری پیدا نشد' });
      res.json({ success: true });
    } catch (error) {
      console.error('PATCH /admin/polls/:id/status:', error);
      res.status(500).json({ success: false, error: 'خطا در تغییر وضعیت رأی‌گیری' });
    }
  });

  app.post('/api/v1/admin/polls/:id/duplicate', authenticateToken, requireAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [[poll]] = await connection.query(`SELECT * FROM polls WHERE id=?`, [req.params.id]);
      if (!poll) { await connection.rollback(); return res.status(404).json({ success: false, error: 'رأی‌گیری پیدا نشد' }); }
      const [options] = await connection.query(`SELECT option_text, sort_order FROM poll_options WHERE poll_id=? ORDER BY sort_order,id`, [req.params.id]);
      const [result] = await connection.query(`
        INSERT INTO polls (title, description, cover_image_url, audience, allow_multiple, max_choices, is_anonymous, results_visibility, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
      `, [`نسخه مشابه - ${poll.title}`, poll.description, poll.cover_image_url || null, poll.audience, poll.allow_multiple, poll.max_choices, poll.is_anonymous, poll.results_visibility, req.user?.id || null]);
      for (const option of options) await connection.query(`INSERT INTO poll_options (poll_id, option_text, sort_order) VALUES (?, ?, ?)`, [result.insertId, option.option_text, option.sort_order]);
      await connection.commit();
      res.status(201).json({ success: true, id: result.insertId });
    } catch (error) {
      await connection.rollback();
      console.error('POST /admin/polls/:id/duplicate:', error);
      res.status(500).json({ success: false, error: 'خطا در ساخت نسخه مشابه' });
    } finally { connection.release(); }
  });

  app.delete('/api/v1/admin/polls/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
      const [result] = await pool.query(`DELETE FROM polls WHERE id=?`, [req.params.id]);
      if (!result.affectedRows) return res.status(404).json({ success: false, error: 'رأی‌گیری پیدا نشد' });
      res.json({ success: true });
    } catch (error) {
      console.error('DELETE /admin/polls/:id:', error);
      res.status(500).json({ success: false, error: 'خطا در حذف رأی‌گیری' });
    }
  });

  app.get('/api/v1/polls/active', authenticateToken, async (req, res) => {
    try {
      await refreshExpiredPolls();
      const role = req.user?.role;
      if (!allowedRoles.includes(role)) return res.json({ success: true, polls: [] });
      const [rows] = await pool.query(`
        SELECT p.* FROM polls p
        WHERE p.status='active' AND (p.starts_at IS NULL OR p.starts_at<=NOW())
          AND (p.ends_at IS NULL OR p.ends_at>=NOW()) AND FIND_IN_SET(?, p.audience)>0
        ORDER BY p.created_at DESC
      `, [role]);
      const polls = await hydratePolls(rows);
      for (const poll of polls) {
        const [[vote]] = await pool.query(`SELECT COUNT(*) AS count FROM poll_votes WHERE poll_id=? AND user_id=?`, [poll.id, req.user?.id]);
        poll.has_voted = Number(vote.count || 0) > 0;
        poll.can_view_results = poll.results_visibility === 'always' || (poll.results_visibility === 'after_vote' && poll.has_voted) || (poll.results_visibility === 'after_close' && poll.status === 'closed');
        if (!poll.can_view_results) poll.options = poll.options.map(option => ({ ...option, votes_count: undefined }));
      }
      res.json({ success: true, polls });
    } catch (error) {
      console.error('GET /polls/active:', error);
      res.status(500).json({ success: false, error: 'خطا در دریافت رأی‌گیری‌های فعال' });
    }
  });

  app.post('/api/v1/polls/:id/vote', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
      const optionIds = [...new Set((Array.isArray(req.body?.option_ids) ? req.body.option_ids : [req.body?.option_id]).map(Number).filter(Boolean))];
      await connection.beginTransaction();
      const [[poll]] = await connection.query(`SELECT * FROM polls WHERE id=? FOR UPDATE`, [req.params.id]);
      if (!poll || poll.status !== 'active') { await connection.rollback(); return res.status(404).json({ success: false, error: 'رأی‌گیری فعال نیست' }); }
      const now = Date.now();
      if (poll.starts_at && new Date(poll.starts_at).getTime() > now) { await connection.rollback(); return res.status(400).json({ success: false, error: 'زمان رأی‌گیری هنوز آغاز نشده است' }); }
      if (poll.ends_at && new Date(poll.ends_at).getTime() < now) { await connection.rollback(); return res.status(400).json({ success: false, error: 'زمان رأی‌گیری پایان یافته است' }); }
      if (!normalizeAudience(poll.audience).includes(req.user?.role)) { await connection.rollback(); return res.status(403).json({ success: false, error: 'شما مخاطب این رأی‌گیری نیستید' }); }
      if (!optionIds.length) { await connection.rollback(); return res.status(400).json({ success: false, error: 'حداقل یک گزینه انتخاب کنید' }); }
      if (!Number(poll.allow_multiple) && optionIds.length !== 1) { await connection.rollback(); return res.status(400).json({ success: false, error: 'فقط یک گزینه قابل انتخاب است' }); }
      if (Number(poll.allow_multiple) && optionIds.length > Number(poll.max_choices || 2)) { await connection.rollback(); return res.status(400).json({ success: false, error: `حداکثر ${poll.max_choices} گزینه قابل انتخاب است` }); }
      const [[already]] = await connection.query(`SELECT COUNT(*) AS count FROM poll_votes WHERE poll_id=? AND user_id=?`, [req.params.id, req.user?.id]);
      if (Number(already.count || 0) > 0) { await connection.rollback(); return res.status(409).json({ success: false, error: 'شما قبلاً در این رأی‌گیری شرکت کرده‌اید' }); }
      const placeholders = optionIds.map(() => '?').join(',');
      const [[validOptions]] = await connection.query(`SELECT COUNT(*) AS count FROM poll_options WHERE poll_id=? AND id IN (${placeholders})`, [req.params.id, ...optionIds]);
      if (Number(validOptions.count || 0) !== optionIds.length) { await connection.rollback(); return res.status(400).json({ success: false, error: 'گزینه انتخاب‌شده معتبر نیست' }); }
      for (const optionId of optionIds) await connection.query(`INSERT INTO poll_votes (poll_id, option_id, user_id, voter_role) VALUES (?, ?, ?, ?)`, [req.params.id, optionId, req.user?.id, req.user?.role]);
      await connection.commit();
      res.json({ success: true, message: 'رأی شما با موفقیت ثبت شد' });
    } catch (error) {
      await connection.rollback();
      console.error('POST /polls/:id/vote:', error);
      if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, error: 'شما قبلاً رأی داده‌اید' });
      res.status(500).json({ success: false, error: 'خطا در ثبت رأی' });
    } finally { connection.release(); }
  });
}
