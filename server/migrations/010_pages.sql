-- Pages / CMS / Legal / FAQ
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('legal', 'faq', 'guide')),
  is_published INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT NOT NULL DEFAULT 'system'
);

INSERT OR IGNORE INTO pages (id, slug, title, content, category, is_published, order_index, created_by)
VALUES
  ('page-terms', 'terms', 'Obchodní podmínky', '# Obchodní podmínky\n\nToto jsou vzorové obchodní podmínky. Upravte je v administraci.', 'legal', 1, 0, 'system'),
  ('page-privacy', 'privacy', 'Ochrana osobních údajů', '# Ochrana osobních údajů\n\nToto je vzorové zpracování osobních údajů. Upravte je v administraci.', 'legal', 1, 1, 'system'),
  ('page-cookies', 'cookies', 'Cookies', '# Cookies\n\nTato aplikace používá pouze nezbytné cookies pro zajištění funkcionality. Další kategorie cookies vyžadují váš souhlas.', 'legal', 1, 2, 'system'),
  ('page-faq', 'faq', 'FAQ / Nápověda', '# Často kladené otázky\n\n- Jak zapsat gól? Použijte scorekeeper rozhraní.\n- Jak vytvořit tým? Jděte do sekce Týmy.', 'faq', 1, 0, 'system');
