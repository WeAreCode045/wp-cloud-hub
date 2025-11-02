import { supabase } from '@/lib/supabase-client';

// Helper functions voor CRUD operaties op Supabase tabellen
export const supabaseEntities = {
  // Users
  users: {
    list: async (filters = {}) => {
      let query = supabase.from('users').select('*');
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (userData) => {
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, userData) => {
      const { data, error } = await supabase
        .from('users')
        .update(userData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Sites
  sites: {
    list: async (filters = {}) => {
      let query = supabase.from('sites').select('*');
      
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error} = await supabase
        .from('sites')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (siteData) => {
      const { data, error } = await supabase
        .from('sites')
        .insert([siteData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, siteData) => {
      const { data, error } = await supabase
        .from('sites')
        .update(siteData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('sites')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Plugins
  plugins: {
    list: async (filters = {}) => {
      let query = supabase.from('plugins').select('*');
      
      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error } = await supabase
        .from('plugins')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (pluginData) => {
      const { data, error } = await supabase
        .from('plugins')
        .insert([pluginData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, pluginData) => {
      const { data, error } = await supabase
        .from('plugins')
        .update(pluginData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('plugins')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  },

  // Site Settings
  siteSettings: {
    list: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');
      if (error) throw error;
      return data;
    },
    get: async (key) => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('setting_key', key)
        .single();
      if (error) throw error;
      return data;
    },
    update: async (key, value) => {
      const { data, error } = await supabase
        .from('site_settings')
        .upsert([{ setting_key: key, setting_value: value }])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Activity Log
  activityLog: {
    list: async (filters = {}) => {
      let query = supabase.from('activity_log').select('*, users(name, email)').order('created_at', { ascending: false });
      
      if (filters.user_id) {
        query = query.eq('user_id', filters.user_id);
      }
      
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    create: async (logData) => {
      const { data, error } = await supabase
        .from('activity_log')
        .insert([logData])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  // Teams
  teams: {
    list: async (filters = {}) => {
      let query = supabase.from('teams').select('*');
      
      if (filters.user_id) {
        // Fetch teams where user is a member
        query = supabase
          .from('team_members')
          .select('teams(*)')
          .eq('user_id', filters.user_id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    get: async (id) => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    create: async (teamData) => {
      const { data, error } = await supabase
        .from('teams')
        .insert([teamData])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    update: async (id, teamData) => {
      const { data, error } = await supabase
        .from('teams')
        .update(teamData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    delete: async (id) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);
      if (error) throw error;
    }
  }
};