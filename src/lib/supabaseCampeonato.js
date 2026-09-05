import { createClient } from '@supabase/supabase-js'

const supabaseCampeonatoUrl =
  'https://imznjbnpecvnoivywnoy.supabase.co'

const supabaseCampeonatoPublishableKey =
  'sb_publishable_E7p63Qia-9VAem_L1PBxnw_tcH-E7m2'

export const supabaseCampeonato = createClient(
  supabaseCampeonatoUrl,
  supabaseCampeonatoPublishableKey,
  {
    auth: {
      storageKey: 'sprint-padel-campeonato-auth',
    },
  }
)
