--
-- PostgreSQL database dump
--

\restrict aYc23NvddAFKDoG77RjZZEkZjnizWzsgmvEESHWU0z0KxzJ60eaoeSAex6FW9By

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO supabase_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO postgres;

--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql;


ALTER SCHEMA graphql OWNER TO supabase_admin;

--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA graphql_public;


ALTER SCHEMA graphql_public OWNER TO supabase_admin;

--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: pgbouncer
--

CREATE SCHEMA pgbouncer;


ALTER SCHEMA pgbouncer OWNER TO pgbouncer;

--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA realtime;


ALTER SCHEMA realtime OWNER TO supabase_admin;

--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA storage;


ALTER SCHEMA storage OWNER TO supabase_admin;

--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: supabase_admin
--

CREATE SCHEMA vault;


ALTER SCHEMA vault OWNER TO supabase_admin;

--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


ALTER TYPE auth.aal_level OWNER TO supabase_auth_admin;

--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


ALTER TYPE auth.code_challenge_method OWNER TO supabase_auth_admin;

--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


ALTER TYPE auth.factor_status OWNER TO supabase_auth_admin;

--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


ALTER TYPE auth.factor_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_authorization_status; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_authorization_status AS ENUM (
    'pending',
    'approved',
    'denied',
    'expired'
);


ALTER TYPE auth.oauth_authorization_status OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_client_type AS ENUM (
    'public',
    'confidential'
);


ALTER TYPE auth.oauth_client_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_registration_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_registration_type AS ENUM (
    'dynamic',
    'manual'
);


ALTER TYPE auth.oauth_registration_type OWNER TO supabase_auth_admin;

--
-- Name: oauth_response_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.oauth_response_type AS ENUM (
    'code'
);


ALTER TYPE auth.oauth_response_type OWNER TO supabase_auth_admin;

--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


ALTER TYPE auth.one_time_token_type OWNER TO supabase_auth_admin;

--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.subscription_tier AS ENUM (
    'free',
    'kader_pintar',
    'muallim_pro',
    'dakwah_digital',
    'sinergi_ranting'
);


ALTER TYPE public.subscription_tier OWNER TO postgres;

--
-- Name: usage_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.usage_action AS ENUM (
    'message',
    'document_upload'
);


ALTER TYPE public.usage_action OWNER TO postgres;

--
-- Name: action; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


ALTER TYPE realtime.action OWNER TO supabase_admin;

--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in',
    'like',
    'ilike',
    'is',
    'match',
    'imatch',
    'isdistinct'
);


ALTER TYPE realtime.equality_op OWNER TO supabase_admin;

--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text,
	negate boolean
);


ALTER TYPE realtime.user_defined_filter OWNER TO supabase_admin;

--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


ALTER TYPE realtime.wal_column OWNER TO supabase_admin;

--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: supabase_admin
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


ALTER TYPE realtime.wal_rls OWNER TO supabase_admin;

--
-- Name: buckettype; Type: TYPE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TYPE storage.buckettype AS ENUM (
    'STANDARD',
    'ANALYTICS',
    'VECTOR'
);


ALTER TYPE storage.buckettype OWNER TO supabase_storage_admin;

--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


ALTER FUNCTION auth.email() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


ALTER FUNCTION auth.jwt() OWNER TO supabase_auth_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: supabase_auth_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;

--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_cron_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
begin
    if not exists (
        select 1
        from pg_event_trigger_ddl_commands() ev
        join pg_catalog.pg_extension e on ev.objid = e.oid
        where e.extname = 'pg_graphql'
    ) then
        return;
    end if;

    drop function if exists graphql_public.graphql;
    create or replace function graphql_public.graphql(
        "operationName" text default null,
        query text default null,
        variables jsonb default null,
        extensions jsonb default null
    )
        returns jsonb
        language sql
    as $$
        select graphql.resolve(
            query := query,
            variables := coalesce(variables, '{}'),
            "operationName" := "operationName",
            extensions := extensions
        );
    $$;

    -- Attach the wrapper to the extension so DROP EXTENSION cascades to it,
    -- which in turn triggers set_graphql_placeholder to reinstall the "not enabled" stub.
    alter extension pg_graphql add function graphql_public.graphql(text, text, jsonb, jsonb);

    grant usage on schema graphql to postgres, anon, authenticated, service_role;
    grant execute on function graphql.resolve to postgres, anon, authenticated, service_role;
    grant usage on schema graphql to postgres with grant option;
    grant usage on schema graphql_public to postgres with grant option;
end;
$_$;


ALTER FUNCTION extensions.grant_pg_graphql_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


ALTER FUNCTION extensions.grant_pg_net_access() OWNER TO supabase_admin;

--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_ddl_watch() OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


ALTER FUNCTION extensions.pgrst_drop_watch() OWNER TO supabase_admin;

--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: supabase_admin
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


ALTER FUNCTION extensions.set_graphql_placeholder() OWNER TO supabase_admin;

--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: supabase_admin
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: graphql(text, text, jsonb, jsonb); Type: FUNCTION; Schema: graphql_public; Owner: supabase_admin
--

CREATE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb) RETURNS jsonb
    LANGUAGE plpgsql
    AS $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;


ALTER FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) OWNER TO supabase_admin;

--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: supabase_admin
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $_$
  BEGIN
      RAISE DEBUG 'PgBouncer auth request: %', p_usename;

      RETURN QUERY
      SELECT
          rolname::text,
          CASE WHEN rolvaliduntil < now()
              THEN null
              ELSE rolpassword::text
          END
      FROM pg_authid
      WHERE rolname=$1 and rolcanlogin;
  END;
  $_$;


ALTER FUNCTION pgbouncer.get_auth(p_usename text) OWNER TO supabase_admin;

--
-- Name: check_usage_limits(public.usage_action, text, integer, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.check_usage_limits(p_action public.usage_action, p_model_used text DEFAULT 'auto'::text, p_estimated_tokens integer DEFAULT 0, p_user_id uuid DEFAULT auth.uid()) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_snapshot jsonb;
  v_allowed_models text[];
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  v_snapshot := public.get_usage_snapshot(p_user_id);
  v_allowed_models := array(
    select jsonb_array_elements_text(v_snapshot -> 'allowed_models')
  );

  if p_action = 'message' and not (p_model_used = any(v_allowed_models)) then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'model_not_allowed'
    );
  end if;

  if p_action = 'message'
    and (v_snapshot ->> 'remaining_messages_today')::integer <= 0 then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'daily_message_limit_exceeded'
    );
  end if;

  if p_action = 'document_upload'
    and (v_snapshot ->> 'remaining_uploads_today')::integer <= 0 then
    return v_snapshot || jsonb_build_object(
      'allowed', false,
      'reason', 'daily_upload_limit_exceeded'
    );
  end if;

  return v_snapshot || jsonb_build_object(
    'allowed', true,
    'reason', null,
    'estimated_tokens', greatest(p_estimated_tokens, 0)
  );
end;
$$;


ALTER FUNCTION public.check_usage_limits(p_action public.usage_action, p_model_used text, p_estimated_tokens integer, p_user_id uuid) OWNER TO postgres;

--
-- Name: ensure_conversation_workspace_owner(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_conversation_workspace_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if new.workspace_id is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.chat_workspaces
    where chat_workspaces.id = new.workspace_id
      and chat_workspaces.user_id = new.user_id
  ) then
    raise exception 'Conversation workspace must belong to the same user.';
  end if;

  return new;
end;
$$;


ALTER FUNCTION public.ensure_conversation_workspace_owner() OWNER TO postgres;

--
-- Name: ensure_user_profile(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.ensure_user_profile(p_user_id uuid DEFAULT auth.uid()) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  insert into public.user_profiles (user_id, daily_message_count, daily_upload_count, daily_reset_date)
  values (p_user_id, 0, 0, current_date)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id, tier, status)
  select p_user_id, 'free'::public.subscription_tier, 'active'
  where not exists (
    select 1
    from public.subscriptions
    where user_id = p_user_id
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
end;
$$;


ALTER FUNCTION public.ensure_user_profile(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_current_subscription_tier(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_subscription_tier(p_user_id uuid DEFAULT auth.uid()) RETURNS public.subscription_tier
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce(
    (
      select s.tier
      from public.subscriptions s
      where s.user_id = p_user_id
        and s.status in ('active', 'trialing')
        and (s.current_period_end is null or s.current_period_end > now())
      order by
        case s.tier
          when 'sinergi_ranting' then 5
          when 'dakwah_digital' then 4
          when 'muallim_pro' then 3
          when 'kader_pintar' then 2
          else 1
        end desc,
        s.created_at desc
      limit 1
    ),
    'free'::public.subscription_tier
  );
$$;


ALTER FUNCTION public.get_current_subscription_tier(p_user_id uuid) OWNER TO postgres;

--
-- Name: get_subscription_limits(public.subscription_tier); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_subscription_limits(p_tier public.subscription_tier) RETURNS TABLE(daily_message_limit integer, daily_upload_limit integer, allowed_models text[])
    LANGUAGE sql STABLE
    AS $$
  select daily_message_limit, daily_upload_limit, allowed_models
  from (
    values
      ('free'::public.subscription_tier, 20, 3, array['auto', 'fast']),
      ('kader_pintar'::public.subscription_tier, 100, 10, array['auto', 'fast', 'smart']),
      ('muallim_pro'::public.subscription_tier, 300, 30, array['auto', 'fast', 'smart', 'document']),
      ('dakwah_digital'::public.subscription_tier, 600, 60, array['auto', 'fast', 'smart', 'document']),
      ('sinergi_ranting'::public.subscription_tier, 2000, 200, array['auto', 'fast', 'smart', 'document'])
  ) as limits(tier, daily_message_limit, daily_upload_limit, allowed_models)
  where limits.tier = coalesce(p_tier, 'free'::public.subscription_tier);
$$;


ALTER FUNCTION public.get_subscription_limits(p_tier public.subscription_tier) OWNER TO postgres;

--
-- Name: get_usage_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_usage_snapshot(p_user_id uuid DEFAULT auth.uid()) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_tier public.subscription_tier;
  v_daily_message_limit integer := 20;
  v_daily_upload_limit integer := 3;
  v_allowed_models text[] := array['auto', 'fast'];
  v_messages_used integer := 0;
  v_uploads_used integer := 0;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.reset_daily_counters(p_user_id);

  v_tier := coalesce(
    public.get_current_subscription_tier(p_user_id),
    'free'::public.subscription_tier
  );

  select
    coalesce(limits.daily_message_limit, 20),
    coalesce(limits.daily_upload_limit, 3),
    coalesce(limits.allowed_models, array['auto', 'fast'])
  into v_daily_message_limit, v_daily_upload_limit, v_allowed_models
  from public.get_subscription_limits(v_tier) limits;

  v_daily_message_limit := greatest(coalesce(v_daily_message_limit, 20), 1);
  v_daily_upload_limit := greatest(coalesce(v_daily_upload_limit, 3), 1);
  v_allowed_models := coalesce(v_allowed_models, array['auto', 'fast']);

  select coalesce(sum(message_count), 0)::integer
  into v_messages_used
  from public.usage_logs
  where user_id = p_user_id
    and action = 'message'
    and created_at >= current_date;

  select coalesce(sum(document_count), 0)::integer
  into v_uploads_used
  from public.usage_logs
  where user_id = p_user_id
    and action = 'document_upload'
    and created_at >= current_date;

  return jsonb_build_object(
    'tier', v_tier,
    'daily_message_limit', v_daily_message_limit,
    'daily_upload_limit', v_daily_upload_limit,
    'messages_used_today', v_messages_used,
    'uploads_used_today', v_uploads_used,
    'remaining_messages_today', greatest(v_daily_message_limit - v_messages_used, 0),
    'remaining_uploads_today', greatest(v_daily_upload_limit - v_uploads_used, 0),
    'allowed_models', v_allowed_models
  );
end;
$$;


ALTER FUNCTION public.get_usage_snapshot(p_user_id uuid) OWNER TO postgres;

--
-- Name: handle_new_auth_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_new_auth_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  perform public.ensure_user_profile(new.id);
  return new;
end;
$$;


ALTER FUNCTION public.handle_new_auth_user() OWNER TO postgres;

--
-- Name: increment_usage(public.usage_action, text, integer, integer, jsonb, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_usage(p_action public.usage_action, p_model_used text DEFAULT 'auto'::text, p_document_count integer DEFAULT 0, p_estimated_tokens integer DEFAULT 0, p_metadata jsonb DEFAULT '{}'::jsonb, p_user_id uuid DEFAULT auth.uid()) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_limit_check jsonb;
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  v_limit_check := public.check_usage_limits(
    p_action,
    p_model_used,
    p_estimated_tokens,
    p_user_id
  );

  if not (v_limit_check ->> 'allowed')::boolean then
    raise exception 'Usage limit exceeded: %', v_limit_check ->> 'reason';
  end if;

  insert into public.usage_logs (
    user_id,
    action,
    model_used,
    message_count,
    document_count,
    estimated_tokens,
    metadata
  )
  values (
    p_user_id,
    p_action,
    p_model_used,
    case when p_action = 'message' then 1 else 0 end,
    case when p_action = 'document_upload' then greatest(p_document_count, 1) else 0 end,
    greatest(p_estimated_tokens, 0),
    coalesce(p_metadata, '{}'::jsonb)
  );

  update public.user_profiles
  set daily_message_count = daily_message_count
      + case when p_action = 'message' then 1 else 0 end,
      daily_upload_count = daily_upload_count
      + case when p_action = 'document_upload' then greatest(p_document_count, 1) else 0 end
  where user_id = p_user_id;

  return public.get_usage_snapshot(p_user_id);
end;
$$;


ALTER FUNCTION public.increment_usage(p_action public.usage_action, p_model_used text, p_document_count integer, p_estimated_tokens integer, p_metadata jsonb, p_user_id uuid) OWNER TO postgres;

--
-- Name: reset_daily_counters(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.reset_daily_counters(p_user_id uuid DEFAULT auth.uid()) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  if p_user_id is null then
    raise exception 'User is not authenticated.';
  end if;

  perform public.ensure_user_profile(p_user_id);

  update public.user_profiles
  set daily_message_count = 0,
      daily_upload_count = 0,
      daily_reset_date = current_date
  where user_id = p_user_id
    and daily_reset_date < current_date;
end;
$$;


ALTER FUNCTION public.reset_daily_counters(p_user_id uuid) OWNER TO postgres;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO postgres;

--
-- Name: search_knowledge_chunks(text, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.search_knowledge_chunks(p_query text, p_limit integer DEFAULT 4) RETURNS TABLE(source_id uuid, source_title text, category text, chunk_order integer, content text, rank real)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  with query as (
    select plainto_tsquery('simple', coalesce(nullif(trim(p_query), ''), ' ')) as value
  )
  select
    sources.id as source_id,
    sources.title as source_title,
    sources.category,
    chunks.chunk_order,
    chunks.content,
    ts_rank(chunks.search_vector, query.value) as rank
  from public.knowledge_chunks chunks
  join public.knowledge_sources sources on sources.id = chunks.source_id
  cross join query
  where sources.status = 'active'
    and sources.is_public = true
    and chunks.search_vector @@ query.value
  order by rank desc, sources.created_at desc, chunks.chunk_order asc
  limit greatest(1, least(coalesce(p_limit, 4), 8));
$$;


ALTER FUNCTION public.search_knowledge_chunks(p_query text, p_limit integer) OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: touch_conversation_after_message(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.touch_conversation_after_message() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;

  return new;
end;
$$;


ALTER FUNCTION public.touch_conversation_after_message() OWNER TO postgres;

--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
    -- Regclass of the table e.g. public.notes
    entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

    -- I, U, D, T: insert, update ...
    action realtime.action = (
        case wal ->> 'action'
            when 'I' then 'INSERT'
            when 'U' then 'UPDATE'
            when 'D' then 'DELETE'
            else 'ERROR'
        end
    );

    -- Is row level security enabled for the table
    is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

    subscriptions realtime.subscription[] = array_agg(subs)
        from
            realtime.subscription subs
        where
            subs.entity = entity_
            -- Filter by action early - only get subscriptions interested in this action
            -- action_filter column can be: '*' (all), 'INSERT', 'UPDATE', or 'DELETE'
            and (subs.action_filter = '*' or subs.action_filter = action::text);

    -- Subscription vars
    working_role regrole;
    working_selected_columns text[];
    claimed_role regrole;
    claims jsonb;

    subscription_id uuid;
    subscription_has_access bool;
    visible_to_subscription_ids uuid[] = '{}';

    -- structured info for wal's columns
    columns realtime.wal_column[];
    -- previous identity values for update/delete
    old_columns realtime.wal_column[];

    error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

    -- Primary jsonb output for record
    output jsonb;

    -- Loop record for iterating unique roles (outer loop)
    role_record record;
    -- Loop record for iterating unique selected_columns within a role (inner loop)
    cols_record record;
    -- Subscription ids visible at the role level (before fanning out by selected_columns)
    visible_role_sub_ids uuid[] = '{}';

begin
    perform set_config('role', null, true);

    columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'columns') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    old_columns =
        array_agg(
            (
                x->>'name',
                x->>'type',
                x->>'typeoid',
                realtime.cast(
                    (x->'value') #>> '{}',
                    coalesce(
                        (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                        (x->>'type')::regtype
                    )
                ),
                (pks ->> 'name') is not null,
                true
            )::realtime.wal_column
        )
        from
            jsonb_array_elements(wal -> 'identity') x
            left join jsonb_array_elements(wal -> 'pk') pks
                on (x ->> 'name') = (pks ->> 'name');

    for role_record in
        select claims_role
        from (select distinct claims_role from unnest(subscriptions)) t
        order by claims_role::text
    loop
        working_role := role_record.claims_role;

        -- Update `is_selectable` for columns and old_columns (once per role)
        columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(columns) c;

        old_columns =
                array_agg(
                    (
                        c.name,
                        c.type_name,
                        c.type_oid,
                        c.value,
                        c.is_pkey,
                        pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                    )::realtime.wal_column
                )
                from
                    unnest(old_columns) c;

        if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
            -- Fan out 400 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 400: Bad Request, no primary key']
                )::realtime.wal_rls;
            end loop;

        -- The claims role does not have SELECT permission to the primary key of entity
        elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
            -- Fan out 401 error per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;
                return next (
                    jsonb_build_object(
                        'schema', wal ->> 'schema',
                        'table', wal ->> 'table',
                        'type', action
                    ),
                    is_rls_enabled,
                    (select array_agg(s.subscription_id) from unnest(subscriptions) as s where s.claims_role = working_role and (s.selected_columns is not distinct from working_selected_columns)),
                    array['Error 401: Unauthorized']
                )::realtime.wal_rls;
            end loop;

        else
            -- Create the prepared statement (once per role)
            if is_rls_enabled and action <> 'DELETE' then
                if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                    deallocate walrus_rls_stmt;
                end if;
                execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
            end if;

            -- Collect all visible subscription IDs for this role (filter check + RLS check)
            visible_role_sub_ids = '{}';

            for subscription_id, claims in (
                    select
                        subs.subscription_id,
                        subs.claims
                    from
                        unnest(subscriptions) subs
                    where
                        subs.entity = entity_
                        and subs.claims_role = working_role
                        and (
                            realtime.is_visible_through_filters(columns, subs.filters)
                            or (
                              action = 'DELETE'
                              and realtime.is_visible_through_filters(old_columns, subs.filters)
                            )
                        )
            ) loop

                if not is_rls_enabled or action = 'DELETE' then
                    visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                else
                    -- Check if RLS allows the role to see the record
                    perform
                        -- Trim leading and trailing quotes from working_role because set_config
                        -- doesn't recognize the role as valid if they are included
                        set_config('role', trim(both '"' from working_role::text), true),
                        set_config('request.jwt.claims', claims::text, true);

                    execute 'execute walrus_rls_stmt' into subscription_has_access;

                    if subscription_has_access then
                        visible_role_sub_ids = visible_role_sub_ids || subscription_id;
                    end if;
                end if;
            end loop;

            perform set_config('role', null, true);

            -- Inner loop: per distinct selected_columns for this role
            for cols_record in
                select selected_columns
                from (select distinct selected_columns from unnest(subscriptions) s where s.claims_role = working_role) t
                order by coalesce(array_to_string(selected_columns, ','), '')
            loop
                working_selected_columns := cols_record.selected_columns;

                output = jsonb_build_object(
                    'schema', wal ->> 'schema',
                    'table', wal ->> 'table',
                    'type', action,
                    'commit_timestamp', to_char(
                        ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
                    ),
                    'columns', (
                        select
                            jsonb_agg(
                                jsonb_build_object(
                                    'name', pa.attname,
                                    'type', pt.typname
                                )
                                order by pa.attnum asc
                            )
                        from
                            pg_attribute pa
                            join pg_type pt
                                on pa.atttypid = pt.oid
                            left join (
                                select unnest(conkey) as pkey_attnum
                                from pg_constraint
                                where conrelid = entity_ and contype = 'p'
                            ) pk on pk.pkey_attnum = pa.attnum
                        where
                            attrelid = entity_
                            and attnum > 0
                            and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
                            and (working_selected_columns is null or pa.attname = any(working_selected_columns) or pk.pkey_attnum is not null)
                    )
                )
                -- Add "record" key for insert and update
                || case
                    when action in ('INSERT', 'UPDATE') then
                        jsonb_build_object(
                            'record',
                            (
                                select
                                    jsonb_object_agg(
                                        -- if unchanged toast, get column name and value from old record
                                        coalesce((c).name, (oc).name),
                                        case
                                            when (c).name is null then (oc).value
                                            else (c).value
                                        end
                                    )
                                from
                                    unnest(columns) c
                                    full outer join unnest(old_columns) oc
                                        on (c).name = (oc).name
                                where
                                    coalesce((c).is_selectable, (oc).is_selectable)
                                    and (working_selected_columns is null or coalesce((c).name, (oc).name) = any(working_selected_columns) or coalesce((c).is_pkey, (oc).is_pkey))
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            )
                        )
                    else '{}'::jsonb
                end
                -- Add "old_record" key for update and delete
                || case
                    when action = 'UPDATE' then
                        jsonb_build_object(
                                'old_record',
                                (
                                    select jsonb_object_agg((c).name, (c).value)
                                    from unnest(old_columns) c
                                    where
                                        (c).is_selectable
                                        and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                        and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                )
                            )
                    when action = 'DELETE' then
                        jsonb_build_object(
                            'old_record',
                            (
                                select jsonb_object_agg((c).name, (c).value)
                                from unnest(old_columns) c
                                where
                                    (c).is_selectable
                                    and (working_selected_columns is null or (c).name = any(working_selected_columns) or (c).is_pkey)
                                    and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                                    and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                            )
                        )
                    else '{}'::jsonb
                end;

                -- Filter visible_role_sub_ids to those matching the current selected_columns group
                visible_to_subscription_ids = coalesce(
                    (
                        select array_agg(s.subscription_id)
                        from unnest(subscriptions) s
                        where s.claims_role = working_role
                          and (s.selected_columns is not distinct from working_selected_columns)
                          and s.subscription_id = any(visible_role_sub_ids)
                    ),
                    '{}'::uuid[]
                );

                return next (
                    output,
                    is_rls_enabled,
                    visible_to_subscription_ids,
                    case
                        when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                        else '{}'
                    end
                )::realtime.wal_rls;
            end loop;

        end if;
    end loop;

    perform set_config('role', null, true);
end;
$$;


ALTER FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


ALTER FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) OWNER TO supabase_admin;

--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


ALTER FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) OWNER TO supabase_admin;

--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  res jsonb;
begin
  if type_::text = 'bytea' then
    return to_jsonb(val);
  end if;
  execute format('select to_jsonb(%L::'|| type_::text || ')', val) into res;
  return res;
end
$$;


ALTER FUNCTION realtime."cast"(val text, type_ regtype) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
/*
Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
*/
declare
    op_symbol text = (
        case
            when op = 'eq' then '='
            when op = 'neq' then '!='
            when op = 'lt' then '<'
            when op = 'lte' then '<='
            when op = 'gt' then '>'
            when op = 'gte' then '>='
            when op = 'in' then '= any'
            else 'UNKNOWN OP'
        end
    );
    res boolean;
begin
    execute format(
        'select %L::'|| type_::text || ' ' || op_symbol
        || ' ( %L::'
        || (
            case
                when op = 'in' then type_::text || '[]'
                else type_::text end
        )
        || ')', val_1, val_2) into res;
    return res;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) OWNER TO supabase_admin;

--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
declare
    op_symbol text;
    res boolean;
begin
    -- IS DISTINCT FROM / IS NOT DISTINCT FROM: infix, both sides typed literals
    if op = 'isdistinct' then
        execute format(
            'select %L::%s %s %L::%s',
            val_1,
            type_::text,
            case when negate then 'IS NOT DISTINCT FROM' else 'IS DISTINCT FROM' end,
            val_2,
            type_::text
        ) into res;
        return res;
    end if;

    -- IS requires a keyword RHS (NULL, TRUE, FALSE, UNKNOWN), not a typed literal
    if op = 'is' then
        if val_2 not in ('null', 'true', 'false', 'unknown') then
            raise exception 'invalid value for is filter: must be null, true, false, or unknown';
        end if;
        execute format(
            'select %L::%s %s %s',
            val_1,
            type_::text,
            case when negate then 'IS NOT' else 'IS' end,
            upper(val_2)
        ) into res;
        return res;
    end if;

    op_symbol = case
        when op = 'eq'    then '='
        when op = 'neq'   then '!='
        when op = 'lt'    then '<'
        when op = 'lte'   then '<='
        when op = 'gt'    then '>'
        when op = 'gte'   then '>='
        when op = 'in'    then '= any'
        when op = 'like'   then 'LIKE'
        when op = 'ilike'  then 'ILIKE'
        when op = 'match'  then '~'
        when op = 'imatch' then '~*'
        else null
    end;

    if op_symbol is null then
        raise exception 'unsupported equality operator: %', op::text;
    end if;

    execute format(
        'select %L::%s %s (%L::%s)',
        val_1,
        type_::text,
        op_symbol,
        val_2,
        case when op = 'in' then type_::text || '[]' else type_::text end
    ) into res;

    return case when negate then not res else res end;
end;
$$;


ALTER FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) OWNER TO supabase_admin;

--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
    select
        filters is null
        or array_length(filters, 1) is null
        or coalesce(
            count(col.name) = count(1)
            and sum(
                realtime.check_equality_op(
                    op:=f.op,
                    type_:=coalesce(col.type_oid::regtype, col.type_name::regtype),
                    val_1:=col.value #>> '{}',
                    val_2:=f.value,
                    negate:=coalesce(f.negate, false)
                )::int
            ) filter (where col.name is not null) = count(col.name),
            false
        )
    from
        unnest(filters) f
        left join unnest(columns) col
            on f.column_name = col.name;
$$;


ALTER FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) OWNER TO supabase_admin;

--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS TABLE(wal jsonb, is_rls_enabled boolean, subscription_ids uuid[], errors text[], slot_changes_count bigint)
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
  WITH pub AS (
    SELECT
      concat_ws(
        ',',
        CASE WHEN bool_or(pubinsert) THEN 'insert' ELSE NULL END,
        CASE WHEN bool_or(pubupdate) THEN 'update' ELSE NULL END,
        CASE WHEN bool_or(pubdelete) THEN 'delete' ELSE NULL END
      ) AS w2j_actions,
      coalesce(
        string_agg(
          realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
          ','
        ) filter (WHERE ppt.tablename IS NOT NULL),
        ''
      ) AS w2j_add_tables
    FROM pg_publication pp
    LEFT JOIN pg_publication_tables ppt ON pp.pubname = ppt.pubname
    WHERE pp.pubname = publication
    GROUP BY pp.pubname
    LIMIT 1
  ),
  -- MATERIALIZED ensures pg_logical_slot_get_changes is called exactly once
  w2j AS MATERIALIZED (
    SELECT x.*, pub.w2j_add_tables
    FROM pub,
         pg_logical_slot_get_changes(
           slot_name, null, max_changes,
           'include-pk', 'true',
           'include-transaction', 'false',
           'include-timestamp', 'true',
           'include-type-oids', 'true',
           'format-version', '2',
           'actions', pub.w2j_actions,
           'add-tables', pub.w2j_add_tables
         ) x
  ),
  slot_count AS (
    SELECT count(*)::bigint AS cnt
    FROM w2j
    WHERE w2j.w2j_add_tables <> ''
  ),
  rls_filtered AS (
    SELECT xyz.wal, xyz.is_rls_enabled, xyz.subscription_ids, xyz.errors
    FROM w2j,
         realtime.apply_rls(
           wal := w2j.data::jsonb,
           max_record_bytes := max_record_bytes
         ) xyz(wal, is_rls_enabled, subscription_ids, errors)
    WHERE w2j.w2j_add_tables <> ''
      AND xyz.subscription_ids[1] IS NOT NULL
  )
  SELECT rf.wal, rf.is_rls_enabled, rf.subscription_ids, rf.errors, sc.cnt
  FROM rls_filtered rf, slot_count sc

  UNION ALL

  SELECT null, null, null, null, sc.cnt
  FROM slot_count sc
  WHERE NOT EXISTS (SELECT 1 FROM rls_filtered)
$$;


ALTER FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) OWNER TO supabase_admin;

--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT
    realtime.wal2json_escape_identifier(nsp.nspname::text)
    || '.'
    || realtime.wal2json_escape_identifier(pc.relname::text)
  FROM pg_class pc
  JOIN pg_namespace nsp ON pc.relnamespace = nsp.oid
  WHERE pc.oid = entity
$$;


ALTER FUNCTION realtime.quote_wal2json(entity regclass) OWNER TO supabase_admin;

--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
  final_payload jsonb;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    -- Check if payload has an 'id' key, if not, add the generated UUID
    IF payload ? 'id' THEN
      final_payload := payload;
    ELSE
      final_payload := jsonb_set(payload, '{id}', to_jsonb(generated_id));
    END IF;

    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, payload, event, topic, private, extension)
    VALUES (generated_id, final_payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: send_binary(bytea, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  generated_id uuid;
BEGIN
  BEGIN
    generated_id := gen_random_uuid();

    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    INSERT INTO realtime.messages (id, binary_payload, event, topic, private, extension)
    VALUES (generated_id, payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'WarnSendingBroadcastMessage: %', SQLERRM;
  END;
END;
$$;


ALTER FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) OWNER TO supabase_admin;

--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
    col_names text[] = coalesce(
            array_agg(a.attname order by a.attnum),
            '{}'::text[]
        )
        from
            pg_catalog.pg_attribute a
        where
            a.attrelid = new.entity
            and a.attnum > 0
            and not a.attisdropped
            and pg_catalog.has_column_privilege(
                (new.claims ->> 'role'),
                a.attrelid,
                a.attnum,
                'SELECT'
            );
    filter realtime.user_defined_filter;
    col_type regtype;
    in_val jsonb;
    selected_col text;
begin
    for filter in select * from unnest(new.filters) loop
        if not filter.column_name = any(col_names) then
            raise exception 'invalid column for filter %', filter.column_name;
        end if;

        col_type = (
            select atttypid::regtype
            from pg_catalog.pg_attribute
            where attrelid = new.entity
                  and attname = filter.column_name
        );
        if col_type is null then
            raise exception 'failed to lookup type for column %', filter.column_name;
        end if;

        if filter.op = 'in'::realtime.equality_op then
            in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
            if coalesce(jsonb_array_length(in_val), 0) > 100 then
                raise exception 'too many values for `in` filter. Maximum 100';
            end if;
        elsif filter.op = 'is'::realtime.equality_op then
            -- `is` requires a keyword RHS rather than a typed literal
            if filter.value not in ('null', 'true', 'false', 'unknown') then
                raise exception 'invalid value for is filter: must be null, true, false, or unknown';
            end if;
            -- IS NULL works for any type, but IS TRUE/FALSE/UNKNOWN require a boolean
            -- operand. Reject the non-null keywords on non-boolean columns here so they
            -- don't abort apply_rls at WAL time.
            if filter.value <> 'null' and col_type <> 'boolean'::regtype then
                raise exception 'is % filter requires a boolean column, got %', filter.value, col_type::text;
            end if;
        elsif filter.op in ('like'::realtime.equality_op, 'ilike'::realtime.equality_op) then
            -- like/ilike apply the text pattern operator (~~); reject column types that
            -- have no such operator instead of failing at WAL time
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = '~~' and oprleft = col_type
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
        elsif filter.op in ('match'::realtime.equality_op, 'imatch'::realtime.equality_op) then
            -- match/imatch apply the regex operators ~ / ~*; reject column types that have
            -- no such operator (e.g. integer) instead of failing at WAL time, mirroring the
            -- like/ilike guard above.
            if not exists (
                select 1 from pg_catalog.pg_operator
                where oprname = case when filter.op = 'imatch'::realtime.equality_op then '~*' else '~' end
                  and oprleft = col_type
                  and oprright = col_type
                  and oprresult = 'boolean'::regtype
            ) then
                raise exception 'operator % requires a text-compatible column type, got %', filter.op::text, col_type::text;
            end if;
            -- validate the regex eagerly so a bad pattern is rejected here, not inside
            -- apply_rls where it would abort the WAL stream for the entity
            begin
                perform '' ~ filter.value;
            exception when others then
                raise exception 'invalid regular expression for % filter: %', filter.op::text, sqlerrm;
            end;
        else
            -- eq/neq/lt/lte/gt/gte: value must be coercable to the type
            perform realtime.cast(filter.value, col_type);
        end if;
    end loop;

    if new.selected_columns is not null then
        for selected_col in select * from unnest(new.selected_columns) loop
            if not selected_col = any(col_names) then
                raise exception 'invalid column for select %', selected_col;
            end if;
        end loop;
    end if;

    -- Apply consistent order to filters so the unique constraint can't be tricked by a
    -- different filter order. negate is part of the sort key.
    new.filters = coalesce(
        array_agg(f order by f.column_name, f.op, f.value, f.negate),
        '{}'
    ) from unnest(new.filters) f;

    new.selected_columns = (
        select array_agg(c order by c)
        from unnest(new.selected_columns) c
    );

    return new;
end;
$$;


ALTER FUNCTION realtime.subscription_check_filters() OWNER TO supabase_admin;

--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


ALTER FUNCTION realtime.to_regrole(role_name text) OWNER TO supabase_admin;

--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


ALTER FUNCTION realtime.topic() OWNER TO supabase_realtime_admin;

--
-- Name: wal2json_escape_identifier(text); Type: FUNCTION; Schema: realtime; Owner: supabase_admin
--

CREATE FUNCTION realtime.wal2json_escape_identifier(name text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  -- Prefix `\`, `,`, `.`, and any whitespace with `\`
  SELECT regexp_replace(name, '([\\,.[:space:]])', '\\\1', 'g')
$$;


ALTER FUNCTION realtime.wal2json_escape_identifier(name text) OWNER TO supabase_admin;

--
-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_any_operation(expected_operations text[]) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$$;


ALTER FUNCTION storage.allow_any_operation(expected_operations text[]) OWNER TO supabase_storage_admin;

--
-- Name: allow_only_operation(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.allow_only_operation(expected_operation text) RETURNS boolean
    LANGUAGE sql STABLE
    AS $$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$$;


ALTER FUNCTION storage.allow_only_operation(expected_operation text) OWNER TO supabase_storage_admin;

--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) OWNER TO supabase_storage_admin;

--
-- Name: enforce_bucket_name_length(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.enforce_bucket_name_length() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$$;


ALTER FUNCTION storage.enforce_bucket_name_length() OWNER TO supabase_storage_admin;

--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION storage.extension(name text) OWNER TO supabase_storage_admin;

--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION storage.filename(name text) OWNER TO supabase_storage_admin;

--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$$;


ALTER FUNCTION storage.foldername(name text) OWNER TO supabase_storage_admin;

--
-- Name: get_common_prefix(text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$$;


ALTER FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text) OWNER TO supabase_storage_admin;

--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION storage.get_size_by_bucket() OWNER TO supabase_storage_admin;

--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text) OWNER TO supabase_storage_admin;

--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text, sort_order text) OWNER TO supabase_storage_admin;

--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION storage.operation() OWNER TO supabase_storage_admin;

--
-- Name: protect_delete(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.protect_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION storage.protect_delete() OWNER TO supabase_storage_admin;

--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$_$;


ALTER FUNCTION storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text) OWNER TO supabase_storage_admin;

--
-- Name: search_by_timestamp(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$_$;


ALTER FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: search_v2(text, text, integer, integer, text, text, text, text); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text) RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$$;


ALTER FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer, levels integer, start_after text, sort_order text, sort_column text, sort_column_after text) OWNER TO supabase_storage_admin;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: supabase_storage_admin
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION storage.update_updated_at_column() OWNER TO supabase_storage_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;

--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: custom_oauth_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.custom_oauth_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_type text NOT NULL,
    identifier text NOT NULL,
    name text NOT NULL,
    client_id text NOT NULL,
    client_secret text NOT NULL,
    acceptable_client_ids text[] DEFAULT '{}'::text[] NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    pkce_enabled boolean DEFAULT true NOT NULL,
    attribute_mapping jsonb DEFAULT '{}'::jsonb NOT NULL,
    authorization_params jsonb DEFAULT '{}'::jsonb NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    email_optional boolean DEFAULT false NOT NULL,
    issuer text,
    discovery_url text,
    skip_nonce_check boolean DEFAULT false NOT NULL,
    cached_discovery jsonb,
    discovery_cached_at timestamp with time zone,
    authorization_url text,
    token_url text,
    userinfo_url text,
    jwks_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    custom_claims_allowlist text[] DEFAULT '{}'::text[] NOT NULL,
    CONSTRAINT custom_oauth_providers_authorization_url_https CHECK (((authorization_url IS NULL) OR (authorization_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_authorization_url_length CHECK (((authorization_url IS NULL) OR (char_length(authorization_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_client_id_length CHECK (((char_length(client_id) >= 1) AND (char_length(client_id) <= 512))),
    CONSTRAINT custom_oauth_providers_discovery_url_length CHECK (((discovery_url IS NULL) OR (char_length(discovery_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_identifier_format CHECK ((identifier ~ '^[a-z0-9][a-z0-9:-]{0,48}[a-z0-9]$'::text)),
    CONSTRAINT custom_oauth_providers_issuer_length CHECK (((issuer IS NULL) OR ((char_length(issuer) >= 1) AND (char_length(issuer) <= 2048)))),
    CONSTRAINT custom_oauth_providers_jwks_uri_https CHECK (((jwks_uri IS NULL) OR (jwks_uri ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_jwks_uri_length CHECK (((jwks_uri IS NULL) OR (char_length(jwks_uri) <= 2048))),
    CONSTRAINT custom_oauth_providers_name_length CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))),
    CONSTRAINT custom_oauth_providers_oauth2_requires_endpoints CHECK (((provider_type <> 'oauth2'::text) OR ((authorization_url IS NOT NULL) AND (token_url IS NOT NULL) AND (userinfo_url IS NOT NULL)))),
    CONSTRAINT custom_oauth_providers_oidc_discovery_url_https CHECK (((provider_type <> 'oidc'::text) OR (discovery_url IS NULL) OR (discovery_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_issuer_https CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NULL) OR (issuer ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_oidc_requires_issuer CHECK (((provider_type <> 'oidc'::text) OR (issuer IS NOT NULL))),
    CONSTRAINT custom_oauth_providers_provider_type_check CHECK ((provider_type = ANY (ARRAY['oauth2'::text, 'oidc'::text]))),
    CONSTRAINT custom_oauth_providers_token_url_https CHECK (((token_url IS NULL) OR (token_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_token_url_length CHECK (((token_url IS NULL) OR (char_length(token_url) <= 2048))),
    CONSTRAINT custom_oauth_providers_userinfo_url_https CHECK (((userinfo_url IS NULL) OR (userinfo_url ~~ 'https://%'::text))),
    CONSTRAINT custom_oauth_providers_userinfo_url_length CHECK (((userinfo_url IS NULL) OR (char_length(userinfo_url) <= 2048)))
);


ALTER TABLE auth.custom_oauth_providers OWNER TO supabase_auth_admin;

--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text,
    code_challenge_method auth.code_challenge_method,
    code_challenge text,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    invite_token text,
    referrer text,
    oauth_client_state_id uuid,
    linking_target_id uuid,
    email_optional boolean DEFAULT false NOT NULL
);


ALTER TABLE auth.flow_state OWNER TO supabase_auth_admin;

--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.flow_state IS 'Stores metadata for all OAuth/SSO login flows';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


ALTER TABLE auth.identities OWNER TO supabase_auth_admin;

--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


ALTER TABLE auth.instances OWNER TO supabase_auth_admin;

--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


ALTER TABLE auth.mfa_amr_claims OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


ALTER TABLE auth.mfa_challenges OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    last_webauthn_challenge_data jsonb
);


ALTER TABLE auth.mfa_factors OWNER TO supabase_auth_admin;

--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: COLUMN mfa_factors.last_webauthn_challenge_data; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.mfa_factors.last_webauthn_challenge_data IS 'Stores the latest WebAuthn challenge data including attestation/assertion for customer verification';


--
-- Name: oauth_authorizations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_authorizations (
    id uuid NOT NULL,
    authorization_id text NOT NULL,
    client_id uuid NOT NULL,
    user_id uuid,
    redirect_uri text NOT NULL,
    scope text NOT NULL,
    state text,
    resource text,
    code_challenge text,
    code_challenge_method auth.code_challenge_method,
    response_type auth.oauth_response_type DEFAULT 'code'::auth.oauth_response_type NOT NULL,
    status auth.oauth_authorization_status DEFAULT 'pending'::auth.oauth_authorization_status NOT NULL,
    authorization_code text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:03:00'::interval) NOT NULL,
    approved_at timestamp with time zone,
    nonce text,
    CONSTRAINT oauth_authorizations_authorization_code_length CHECK ((char_length(authorization_code) <= 255)),
    CONSTRAINT oauth_authorizations_code_challenge_length CHECK ((char_length(code_challenge) <= 128)),
    CONSTRAINT oauth_authorizations_expires_at_future CHECK ((expires_at > created_at)),
    CONSTRAINT oauth_authorizations_nonce_length CHECK ((char_length(nonce) <= 255)),
    CONSTRAINT oauth_authorizations_redirect_uri_length CHECK ((char_length(redirect_uri) <= 2048)),
    CONSTRAINT oauth_authorizations_resource_length CHECK ((char_length(resource) <= 2048)),
    CONSTRAINT oauth_authorizations_scope_length CHECK ((char_length(scope) <= 4096)),
    CONSTRAINT oauth_authorizations_state_length CHECK ((char_length(state) <= 4096))
);


ALTER TABLE auth.oauth_authorizations OWNER TO supabase_auth_admin;

--
-- Name: oauth_client_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_client_states (
    id uuid NOT NULL,
    provider_type text NOT NULL,
    code_verifier text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE auth.oauth_client_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE oauth_client_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.oauth_client_states IS 'Stores OAuth states for third-party provider authentication flows where Supabase acts as the OAuth client.';


--
-- Name: oauth_clients; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_clients (
    id uuid NOT NULL,
    client_secret_hash text,
    registration_type auth.oauth_registration_type NOT NULL,
    redirect_uris text NOT NULL,
    grant_types text NOT NULL,
    client_name text,
    client_uri text,
    logo_uri text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    client_type auth.oauth_client_type DEFAULT 'confidential'::auth.oauth_client_type NOT NULL,
    token_endpoint_auth_method text NOT NULL,
    CONSTRAINT oauth_clients_client_name_length CHECK ((char_length(client_name) <= 1024)),
    CONSTRAINT oauth_clients_client_uri_length CHECK ((char_length(client_uri) <= 2048)),
    CONSTRAINT oauth_clients_logo_uri_length CHECK ((char_length(logo_uri) <= 2048)),
    CONSTRAINT oauth_clients_token_endpoint_auth_method_check CHECK ((token_endpoint_auth_method = ANY (ARRAY['client_secret_basic'::text, 'client_secret_post'::text, 'none'::text])))
);


ALTER TABLE auth.oauth_clients OWNER TO supabase_auth_admin;

--
-- Name: oauth_consents; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.oauth_consents (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    client_id uuid NOT NULL,
    scopes text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT oauth_consents_revoked_after_granted CHECK (((revoked_at IS NULL) OR (revoked_at >= granted_at))),
    CONSTRAINT oauth_consents_scopes_length CHECK ((char_length(scopes) <= 2048)),
    CONSTRAINT oauth_consents_scopes_not_empty CHECK ((char_length(TRIM(BOTH FROM scopes)) > 0))
);


ALTER TABLE auth.oauth_consents OWNER TO supabase_auth_admin;

--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


ALTER TABLE auth.one_time_tokens OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;

--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: supabase_auth_admin
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;

--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: supabase_auth_admin
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


ALTER TABLE auth.saml_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


ALTER TABLE auth.saml_relay_states OWNER TO supabase_auth_admin;

--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;

--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    oauth_client_id uuid,
    refresh_token_hmac_key text,
    refresh_token_counter bigint,
    scopes text,
    CONSTRAINT sessions_scopes_length CHECK ((char_length(scopes) <= 4096))
);


ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;

--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: COLUMN sessions.refresh_token_hmac_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_hmac_key IS 'Holds a HMAC-SHA256 key used to sign refresh tokens for this session.';


--
-- Name: COLUMN sessions.refresh_token_counter; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sessions.refresh_token_counter IS 'Holds the ID (counter) of the last issued refresh token.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


ALTER TABLE auth.sso_domains OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    disabled boolean,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


ALTER TABLE auth.sso_providers OWNER TO supabase_auth_admin;

--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


ALTER TABLE auth.users OWNER TO supabase_auth_admin;

--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: webauthn_challenges; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge_type text NOT NULL,
    session_data jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT webauthn_challenges_challenge_type_check CHECK ((challenge_type = ANY (ARRAY['signup'::text, 'registration'::text, 'authentication'::text])))
);


ALTER TABLE auth.webauthn_challenges OWNER TO supabase_auth_admin;

--
-- Name: webauthn_credentials; Type: TABLE; Schema: auth; Owner: supabase_auth_admin
--

CREATE TABLE auth.webauthn_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    credential_id bytea NOT NULL,
    public_key bytea NOT NULL,
    attestation_type text DEFAULT ''::text NOT NULL,
    aaguid uuid,
    sign_count bigint DEFAULT 0 NOT NULL,
    transports jsonb DEFAULT '[]'::jsonb NOT NULL,
    backup_eligible boolean DEFAULT false NOT NULL,
    backed_up boolean DEFAULT false NOT NULL,
    friendly_name text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone
);


ALTER TABLE auth.webauthn_credentials OWNER TO supabase_auth_admin;

--
-- Name: chat_workspaces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chat_workspaces_name_not_blank CHECK ((length(btrim(name)) > 0))
);


ALTER TABLE public.chat_workspaces OWNER TO postgres;

--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid DEFAULT auth.uid() NOT NULL,
    title text DEFAULT 'Obrolan baru'::text NOT NULL,
    selected_model text DEFAULT 'auto'::text NOT NULL,
    document_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    study_mode text DEFAULT 'cambridge_tutor'::text NOT NULL,
    workspace_id uuid,
    is_pinned boolean DEFAULT false NOT NULL,
    CONSTRAINT conversations_selected_model_check CHECK ((selected_model = ANY (ARRAY['auto'::text, 'fast'::text, 'smart'::text, 'document'::text]))),
    CONSTRAINT conversations_study_mode_check CHECK ((study_mode = ANY (ARRAY['quick_explain'::text, 'cambridge_tutor'::text, 'osn_coach'::text, 'islamic_teacher'::text, 'coding_mentor'::text, 'research_mode'::text, 'step_by_step'::text])))
);


ALTER TABLE public.conversations OWNER TO postgres;

--
-- Name: knowledge_chunks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_chunks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_id uuid NOT NULL,
    chunk_order integer NOT NULL,
    content text NOT NULL,
    search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple'::regconfig, content)) STORED,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_chunks_chunk_order_check CHECK ((chunk_order >= 0))
);


ALTER TABLE public.knowledge_chunks OWNER TO postgres;

--
-- Name: knowledge_sources; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_sources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    category text DEFAULT 'general'::text NOT NULL,
    file_type text NOT NULL,
    original_file_name text,
    status text DEFAULT 'active'::text NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    chunk_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_sources_category_check CHECK ((char_length(category) <= 120)),
    CONSTRAINT knowledge_sources_chunk_count_check CHECK ((chunk_count >= 0)),
    CONSTRAINT knowledge_sources_file_type_check CHECK ((file_type = ANY (ARRAY['pdf'::text, 'docx'::text, 'pptx'::text, 'xlsx'::text]))),
    CONSTRAINT knowledge_sources_status_check CHECK ((status = ANY (ARRAY['active'::text, 'draft'::text, 'archived'::text]))),
    CONSTRAINT knowledge_sources_title_check CHECK ((char_length(title) <= 240))
);


ALTER TABLE public.knowledge_sources OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    selected_model text DEFAULT 'auto'::text NOT NULL,
    document_metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    study_mode text DEFAULT 'cambridge_tutor'::text NOT NULL,
    CONSTRAINT messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text]))),
    CONSTRAINT messages_selected_model_check CHECK ((selected_model = ANY (ARRAY['auto'::text, 'fast'::text, 'smart'::text, 'document'::text]))),
    CONSTRAINT messages_study_mode_check CHECK ((study_mode = ANY (ARRAY['quick_explain'::text, 'cambridge_tutor'::text, 'osn_coach'::text, 'islamic_teacher'::text, 'coding_mentor'::text, 'research_mode'::text, 'step_by_step'::text])))
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    tier public.subscription_tier DEFAULT 'free'::public.subscription_tier NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    current_period_start timestamp with time zone DEFAULT now() NOT NULL,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'trialing'::text, 'past_due'::text, 'canceled'::text, 'expired'::text])))
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: usage_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action public.usage_action NOT NULL,
    model_used text DEFAULT 'auto'::text NOT NULL,
    message_count integer DEFAULT 0 NOT NULL,
    document_count integer DEFAULT 0 NOT NULL,
    estimated_tokens integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT usage_logs_document_count_check CHECK ((document_count >= 0)),
    CONSTRAINT usage_logs_estimated_tokens_check CHECK ((estimated_tokens >= 0)),
    CONSTRAINT usage_logs_message_count_check CHECK ((message_count >= 0)),
    CONSTRAINT usage_logs_model_used_check CHECK ((model_used = ANY (ARRAY['auto'::text, 'fast'::text, 'smart'::text, 'document'::text])))
);


ALTER TABLE public.usage_logs OWNER TO postgres;

--
-- Name: user_memory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_memory (
    user_id uuid NOT NULL,
    display_name text,
    school_level text,
    learning_goals text,
    favorite_subjects text[] DEFAULT '{}'::text[] NOT NULL,
    preferred_language text,
    preferred_explanation_style text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    theme_preference text DEFAULT 'system'::text NOT NULL,
    default_model text DEFAULT 'auto'::text NOT NULL,
    default_study_mode text DEFAULT 'cambridge_tutor'::text NOT NULL,
    CONSTRAINT user_memory_default_model_check CHECK ((default_model = ANY (ARRAY['auto'::text, 'fast'::text, 'smart'::text, 'document'::text]))),
    CONSTRAINT user_memory_default_study_mode_check CHECK ((char_length(default_study_mode) <= 80)),
    CONSTRAINT user_memory_display_name_check CHECK ((char_length(display_name) <= 80)),
    CONSTRAINT user_memory_favorite_subjects_check CHECK (((array_length(favorite_subjects, 1) IS NULL) OR (array_length(favorite_subjects, 1) <= 8))),
    CONSTRAINT user_memory_learning_goals_check CHECK ((char_length(learning_goals) <= 400)),
    CONSTRAINT user_memory_preferred_explanation_style_check CHECK ((char_length(preferred_explanation_style) <= 220)),
    CONSTRAINT user_memory_preferred_language_check CHECK ((char_length(preferred_language) <= 60)),
    CONSTRAINT user_memory_school_level_check CHECK ((char_length(school_level) <= 80)),
    CONSTRAINT user_memory_theme_preference_check CHECK ((theme_preference = ANY (ARRAY['system'::text, 'light'::text, 'dark'::text])))
);


ALTER TABLE public.user_memory OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    user_id uuid NOT NULL,
    display_name text,
    daily_message_count integer DEFAULT 0 NOT NULL,
    daily_upload_count integer DEFAULT 0 NOT NULL,
    daily_reset_date date DEFAULT CURRENT_DATE NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_profiles_daily_message_count_check CHECK ((daily_message_count >= 0)),
    CONSTRAINT user_profiles_daily_upload_count_check CHECK ((daily_upload_count >= 0))
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    binary_payload bytea
)
PARTITION BY RANGE (inserted_at);


ALTER TABLE realtime.messages OWNER TO supabase_realtime_admin;

--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


ALTER TABLE realtime.schema_migrations OWNER TO supabase_admin;

--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: supabase_admin
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    action_filter text DEFAULT '*'::text,
    selected_columns text[],
    CONSTRAINT subscription_action_filter_check CHECK ((action_filter = ANY (ARRAY['*'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


ALTER TABLE realtime.subscription OWNER TO supabase_admin;

--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text,
    type storage.buckettype DEFAULT 'STANDARD'::storage.buckettype NOT NULL
);


ALTER TABLE storage.buckets OWNER TO supabase_storage_admin;

--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: buckets_analytics; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_analytics (
    name text NOT NULL,
    type storage.buckettype DEFAULT 'ANALYTICS'::storage.buckettype NOT NULL,
    format text DEFAULT 'ICEBERG'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE storage.buckets_analytics OWNER TO supabase_storage_admin;

--
-- Name: buckets_vectors; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.buckets_vectors (
    id text NOT NULL,
    type storage.buckettype DEFAULT 'VECTOR'::storage.buckettype NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.buckets_vectors OWNER TO supabase_storage_admin;

--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE storage.migrations OWNER TO supabase_storage_admin;

--
-- Name: objects; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


ALTER TABLE storage.objects OWNER TO supabase_storage_admin;

--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: supabase_storage_admin
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb,
    metadata jsonb
);


ALTER TABLE storage.s3_multipart_uploads OWNER TO supabase_storage_admin;

--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.s3_multipart_uploads_parts OWNER TO supabase_storage_admin;

--
-- Name: vector_indexes; Type: TABLE; Schema: storage; Owner: supabase_storage_admin
--

CREATE TABLE storage.vector_indexes (
    id text DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL COLLATE pg_catalog."C",
    bucket_id text NOT NULL,
    data_type text NOT NULL,
    dimension integer NOT NULL,
    distance_metric text NOT NULL,
    metadata_configuration jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE storage.vector_indexes OWNER TO supabase_storage_admin;

--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.custom_oauth_providers (id, provider_type, identifier, name, client_id, client_secret, acceptable_client_ids, scopes, pkce_enabled, attribute_mapping, authorization_params, enabled, email_optional, issuer, discovery_url, skip_nonce_check, cached_discovery, discovery_cached_at, authorization_url, token_url, userinfo_url, jwks_uri, created_at, updated_at, custom_claims_allowlist) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at, invite_token, referrer, oauth_client_state_id, linking_target_id, email_optional) FROM stdin;
90d876cd-39b5-4e77-b716-ef2f97649632	fece616b-a116-40fa-b0c4-0ec6e06731f3	7130a0f4-5fdd-4f56-b00c-09d2d7db8cca	s256	MMtjizhh5Pqmq-SFdxOMtIwXlWIWGXydG73gjEV-76Q	email			2026-05-30 03:16:12.357935+00	2026-05-30 03:16:12.357935+00	email/signup	\N	\N	\N	\N	\N	f
c629a8c0-1e12-41a4-8110-d180cedd6317	b3851cca-565d-4d4e-8e85-00e68f326caf	82b28728-85d9-470c-b302-24aeaa4afa73	s256	Zyq-YtzVMimgdzlGiLfVFzd6KEI36L4lThwVQ3APejM	email			2026-05-30 03:38:12.510911+00	2026-05-30 03:38:41.764407+00	email/signup	2026-05-30 03:38:41.764357+00	\N	\N	\N	\N	f
ec166b2f-eac6-4976-9f02-6d24d49e5db2	fece616b-a116-40fa-b0c4-0ec6e06731f3	15612c73-5de3-4854-a062-37d212a40b45	s256	uk0oYH6WyocQZ3ZOEXMHeyUDq3m4ixir2IbhLs9VDUY	email			2026-05-30 06:14:41.014388+00	2026-05-30 06:14:41.014388+00	email/signup	\N	\N	\N	\N	\N	f
d9ec54f7-79fc-44fd-abc5-0c0438fd315f	fece616b-a116-40fa-b0c4-0ec6e06731f3	22117982-5b81-4173-ba77-19a08a52506a	s256	FEGHB67K4gsA2_EtepT5bxpY0_gMvUaFb45ieMvs1qg	email			2026-05-30 06:15:44.951666+00	2026-05-30 06:16:03.965378+00	email/signup	2026-05-30 06:16:03.965326+00	\N	\N	\N	\N	f
09539cc8-dfa8-4d84-82b1-0290a82875ca	e6eb571b-71a6-467c-9f69-f47f1e0664f1	a4fece4c-ec20-4906-b62d-0959d35e3e43	s256	G0GwDwbqBhStUzIBX-BTry0ObwZEoVMdjtdOUOpQG3I	email			2026-05-30 07:26:13.43576+00	2026-05-30 07:26:59.884472+00	email/signup	2026-05-30 07:26:59.884422+00	\N	\N	\N	\N	f
61b63348-74ea-4721-8052-986cb0222d23	e6eb571b-71a6-467c-9f69-f47f1e0664f1	ef4e2fd3-6c8b-4310-aa91-053e43b36a41	s256	g3OpWDS8vDI-DttjCNlg860QLQDG40r2RUgdYE1E9xw	magiclink			2026-05-30 07:27:10.961618+00	2026-05-30 07:27:10.961618+00	magiclink	\N	\N	\N	\N	\N	f
3eacf062-9cb6-4228-a508-7bc79266ca10	e6eb571b-71a6-467c-9f69-f47f1e0664f1	6abbe3f3-ac25-4ab3-badf-5035318e23b1	s256	b_DxVADCLOdpUBR6niHdw9ZoQRF_2ButiT0UF75KUCI	magiclink			2026-05-30 07:49:12.431901+00	2026-05-30 07:49:12.431901+00	magiclink	\N	\N	\N	\N	\N	f
3c540af3-79a6-42ff-8758-81a2b65c60a3	e6eb571b-71a6-467c-9f69-f47f1e0664f1	0a37aed3-ca3e-491c-9362-2f58009ff9f7	s256	Lqs5sf4GuuR9Jr0xayi-WUsB_K-5Ylpz7kX9eBEBZFE	magiclink			2026-05-30 08:01:54.674833+00	2026-05-30 08:01:54.674833+00	magiclink	\N	\N	\N	\N	\N	f
d77956d9-0b94-4d86-aa79-11a32ee197ff	fa930b99-a432-407c-b2bc-d12e0df7033f	8d04938c-6cd4-41be-ad3f-822f09436bcb	s256	FzxrKbDaTtSBK7yRV8ZpahXFtu_xvwsYFoyVK9KlVJ4	magiclink			2026-05-30 09:11:42.044181+00	2026-05-30 09:11:42.044181+00	magiclink	\N	\N	\N	\N	\N	f
6190f3a5-5306-4d77-94e0-d0427988496a	e6eb571b-71a6-467c-9f69-f47f1e0664f1	e71eb811-658b-4381-8ea0-471e2387e173	s256	5rPZjsbhmHkdcIXOPdxB4ZQ5Fy0gsUPMnsGxlu2bclY	magiclink			2026-05-30 12:29:03.194176+00	2026-05-30 12:29:03.194176+00	magiclink	\N	\N	\N	\N	\N	f
e27b6451-db87-40fc-8c4b-4f049ef85b26	e6eb571b-71a6-467c-9f69-f47f1e0664f1	bec32ac4-e572-4cee-868c-2d871823af33	s256	gRxEN2QQ6S4KDYXp7XpLGPHFdnuRQ0oasDL_81ygilE	magiclink			2026-05-30 13:14:13.772661+00	2026-05-30 13:14:13.772661+00	magiclink	\N	\N	\N	\N	\N	f
2341fdc5-d8dd-43af-8801-0a669ace3d3f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	73b4b56c-4348-4f40-98c7-8319a6f32d84	s256	BOgPlqHzl7df__XXqJ7mQI3SHUCc_zPTfK52fsNF3zk	magiclink			2026-05-30 13:31:39.218819+00	2026-05-30 13:31:39.218819+00	magiclink	\N	\N	\N	\N	\N	f
b2c638d1-cf8e-4bcc-b262-3eb81ea28266	e6eb571b-71a6-467c-9f69-f47f1e0664f1	8d2609a5-715c-478d-b515-79aefcac5277	s256	Meb6EXwoJIMnlyoz6Vouqjmlsej93BqnxQcVH2WGUDo	magiclink			2026-05-30 13:56:07.607776+00	2026-05-30 13:56:07.607776+00	magiclink	\N	\N	\N	\N	\N	f
ccd0178a-0ff1-431b-be50-2b3cf8e7828a	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	2a9a1294-56a7-4aee-b312-8a82321f72bc	s256	EaauwbvRLaoC44JBEdEZY0IibqjJ3qYCSmu9p8dzDlo	magiclink			2026-06-01 06:25:10.848397+00	2026-06-01 06:25:10.848397+00	magiclink	\N	\N	\N	\N	\N	f
8c0f79fb-6187-48ec-9ebe-478ca3f7257c	b01e9a49-58e3-4efe-88e5-72e93a37f622	28b57a5a-22da-47de-9fdf-428ac18da720	s256	zgYBvSllt6NwkrazVXbIRuj7_hiIR9RorDEY2I3K4Og	magiclink			2026-06-02 02:52:48.436191+00	2026-06-02 02:52:48.436191+00	magiclink	\N	\N	\N	\N	\N	f
89857645-2204-47a2-bcd2-6fcf729ddcab	e6eb571b-71a6-467c-9f69-f47f1e0664f1	ac43f292-5a13-4054-80ff-0ffc82e612fa	s256	ky7a6DK0yQMMB99nxSm79pDCE2ZCpbCjLswxMRB42t4	magiclink			2026-06-03 03:26:10.674288+00	2026-06-03 03:26:10.674288+00	magiclink	\N	\N	\N	\N	\N	f
084d2b65-5aa2-4d31-900e-d145626493e9	0401f446-d10e-412e-82a6-8ceddafe9bcb	5eb50ce8-464c-477a-a477-237ca1317123	s256	I0EI4tL24mANFu87hnIySdJiyMIni2kpGRRi5YfMsEI	magiclink			2026-06-08 04:01:40.945586+00	2026-06-08 04:01:40.945586+00	magiclink	\N	\N	\N	\N	\N	f
444d25a1-9899-4d70-8c61-fc9db48a8f75	854cc3b9-7718-47af-bfa5-6266829cb5b6	1b656399-bbee-4184-bf53-a3dac22cbd41	s256	jczfzte177WL81Zvw-noE-OZNAOYrsJG64D5Zrx3D84	magiclink			2026-06-08 13:49:24.9702+00	2026-06-08 13:49:24.9702+00	magiclink	\N	\N	\N	\N	\N	f
c9a674e5-0c05-4336-8106-df743d0f84f4	854cc3b9-7718-47af-bfa5-6266829cb5b6	77ebd696-7a34-4c75-9fab-d2a2e5b6128c	s256	au_lCxmVfhdH_kdbGg9OqXTTNBCsD1QZUsHKDNpr5vg	magiclink			2026-06-08 13:49:28.348937+00	2026-06-08 13:49:28.348937+00	magiclink	\N	\N	\N	\N	\N	f
50bb9c97-5007-4e24-933f-38b4ab12bcb8	854cc3b9-7718-47af-bfa5-6266829cb5b6	ba16171f-9978-4512-a9fe-09b9b1f5ea43	s256	lB0rd3GQAMh4WGGjZn8Yb_ZCFwzhPi7jgasktjmhMrk	magiclink			2026-06-08 13:49:29.19429+00	2026-06-08 13:49:29.19429+00	magiclink	\N	\N	\N	\N	\N	f
4cc5f0c7-b0eb-46e6-b943-56df6c0c51ac	854cc3b9-7718-47af-bfa5-6266829cb5b6	581331ea-a7c3-41d7-969e-73a16e05b929	s256	cSW2PsqIT8Iy9FYAMDIMh2NWxXTk2CE2ne2tBlcSYco	magiclink			2026-06-09 00:44:18.981842+00	2026-06-09 00:44:18.981842+00	magiclink	\N	\N	\N	\N	\N	f
1c53cbba-f37a-47e2-8d2b-aa4f5665b70a	854cc3b9-7718-47af-bfa5-6266829cb5b6	f210b221-bdf9-4526-98bf-bd35ad25e26e	s256	Npeur3dEwcOS06yqg4pvDi9tZIC19QtyzPr9JiyAnhE	magiclink			2026-06-09 00:44:59.615256+00	2026-06-09 00:44:59.615256+00	magiclink	\N	\N	\N	\N	\N	f
ddecce2e-c204-4123-ab24-06a84fe1b1b4	e6eb571b-71a6-467c-9f69-f47f1e0664f1	b8b77a4e-39d5-4373-b4bc-a80ba970b0d7	s256	CnsAbT1oJoi9w1NC_89cwjPAxCfy55pcwaqTF1DQL2k	magiclink			2026-07-01 11:22:22.7509+00	2026-07-01 11:22:22.7509+00	magiclink	\N	\N	\N	\N	\N	f
57dc9879-ee8c-4133-a49c-faf4bd0b64ba	e6eb571b-71a6-467c-9f69-f47f1e0664f1	421216e6-1c0e-47a3-8fc6-15e61ec8cdd8	s256	oo04teV78yiWZS_XL3HGAOb64NlHADUnl6hUjyHBUYA	magiclink			2026-07-04 03:20:47.777792+00	2026-07-04 03:20:47.777792+00	magiclink	\N	\N	\N	\N	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
e6eb571b-71a6-467c-9f69-f47f1e0664f1	e6eb571b-71a6-467c-9f69-f47f1e0664f1	{"sub": "e6eb571b-71a6-467c-9f69-f47f1e0664f1", "email": "arhamhabiburrahman@gmail.com", "email_verified": true, "phone_verified": false}	email	2026-05-30 07:26:13.430398+00	2026-05-30 07:26:13.430447+00	2026-05-30 07:26:13.430447+00	341d8308-d560-47bc-ac99-95e9c18e107e
fa930b99-a432-407c-b2bc-d12e0df7033f	fa930b99-a432-407c-b2bc-d12e0df7033f	{"sub": "fa930b99-a432-407c-b2bc-d12e0df7033f", "email": "arhamhabiburrahman@gmail.com.com", "email_verified": false, "phone_verified": false}	email	2026-05-30 09:11:41.996048+00	2026-05-30 09:11:41.996102+00	2026-05-30 09:11:41.996102+00	c5915642-abd7-402b-8bd5-6246656a8a05
7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	{"sub": "7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5", "email": "newzbipzz@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-01 06:25:10.779775+00	2026-06-01 06:25:10.779828+00	2026-06-01 06:25:10.779828+00	3acd9aa1-8c82-4f27-96fa-e211ef2da011
b01e9a49-58e3-4efe-88e5-72e93a37f622	b01e9a49-58e3-4efe-88e5-72e93a37f622	{"sub": "b01e9a49-58e3-4efe-88e5-72e93a37f622", "email": "adif171580@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-02 02:52:48.39283+00	2026-06-02 02:52:48.392884+00	2026-06-02 02:52:48.392884+00	7170228a-9457-48c6-800c-472b48f60506
0401f446-d10e-412e-82a6-8ceddafe9bcb	0401f446-d10e-412e-82a6-8ceddafe9bcb	{"sub": "0401f446-d10e-412e-82a6-8ceddafe9bcb", "email": "fhssierin@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-08 04:01:40.849031+00	2026-06-08 04:01:40.849099+00	2026-06-08 04:01:40.849099+00	1ea11ded-ab1c-451b-bb99-6027bf65de21
854cc3b9-7718-47af-bfa5-6266829cb5b6	854cc3b9-7718-47af-bfa5-6266829cb5b6	{"sub": "854cc3b9-7718-47af-bfa5-6266829cb5b6", "email": "reyhalnabilsunandar@gmail.com", "email_verified": false, "phone_verified": false}	email	2026-06-08 13:49:24.872962+00	2026-06-08 13:49:24.873025+00	2026-06-08 13:49:24.873025+00	bbcd11dd-459c-46d1-ab82-ef8c1a194cba
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
87136c89-029c-40ad-a5a5-23aa6a7660ad	2026-05-30 09:11:42.030023+00	2026-05-30 09:11:42.030023+00	password	f095dad9-75e5-43e5-9796-42c189f00c58
8fefb070-db38-45d9-af86-708931cf0bb1	2026-06-01 06:25:10.820072+00	2026-06-01 06:25:10.820072+00	password	29e5311a-262f-49eb-bf75-a570b848e344
21f8756f-3983-40a1-8de9-0744dffcee20	2026-06-01 06:25:59.202397+00	2026-06-01 06:25:59.202397+00	otp	93006eda-7662-4de5-997c-f2a94c65f2d6
e9100f0d-45aa-42bf-852d-c8cb21010371	2026-06-02 02:52:48.41667+00	2026-06-02 02:52:48.41667+00	password	7bfe022c-0b56-4e4c-98b1-41d9ae644f51
29e22bca-c2e3-477b-9fab-dc73203953da	2026-06-02 02:53:10.755299+00	2026-06-02 02:53:10.755299+00	otp	108cb7eb-3b04-4b3e-a39d-9e49a2efb4e2
db03662a-40fa-4519-a378-5a592cdd295f	2026-06-08 04:01:40.914426+00	2026-06-08 04:01:40.914426+00	password	842bf9d8-1455-4bfb-969a-bad0514d6ac6
8307a4c7-df8b-4a8f-b93e-b21ff8f530e3	2026-06-08 04:02:22.143873+00	2026-06-08 04:02:22.143873+00	otp	ef597858-137d-4505-9177-b17c1c2e4a16
86a61d65-d986-488f-af8b-3587ce86583d	2026-06-08 13:49:24.939303+00	2026-06-08 13:49:24.939303+00	password	1eac6aa3-82c8-43d3-849b-65d180e58866
50f6f868-ec27-43d0-9ad5-37274c167ed8	2026-06-09 00:45:25.146134+00	2026-06-09 00:45:25.146134+00	otp	e315c484-f284-473e-a550-2e1c740bff00
9548da54-1a21-4892-a6b3-112864952942	2026-07-01 11:22:39.925626+00	2026-07-01 11:22:39.925626+00	otp	b6470824-ab03-43fb-9de1-0a9d3ec2898e
71796872-a82d-410f-bfe5-739f77e19ffa	2026-07-04 03:21:13.266692+00	2026-07-04 03:21:13.266692+00	otp	4550862b-6b99-4797-8694-ad7d3ba0b1e1
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid, last_webauthn_challenge_data) FROM stdin;
\.


--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_authorizations (id, authorization_id, client_id, user_id, redirect_uri, scope, state, resource, code_challenge, code_challenge_method, response_type, status, authorization_code, created_at, expires_at, approved_at, nonce) FROM stdin;
\.


--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_client_states (id, provider_type, code_verifier, created_at) FROM stdin;
\.


--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_clients (id, client_secret_hash, registration_type, redirect_uris, grant_types, client_name, client_uri, logo_uri, created_at, updated_at, deleted_at, client_type, token_endpoint_auth_method) FROM stdin;
\.


--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.oauth_consents (id, user_id, client_id, scopes, granted_at, revoked_at) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
9bf99d29-db14-4859-be7b-711439b9968c	fa930b99-a432-407c-b2bc-d12e0df7033f	recovery_token	pkce_5b7e55f77e060da7b0f0b7c616e30cfce6000684f2db64c10b1da435	arhamhabiburrahman@gmail.com.com	2026-05-30 09:11:43.880929	2026-05-30 09:11:43.880929
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
00000000-0000-0000-0000-000000000000	1	x6ubaqt3mydj	fa930b99-a432-407c-b2bc-d12e0df7033f	f	2026-05-30 09:11:42.019501+00	2026-05-30 09:11:42.019501+00	\N	87136c89-029c-40ad-a5a5-23aa6a7660ad
00000000-0000-0000-0000-000000000000	15	4ld75codwvjg	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	f	2026-06-01 06:25:10.809976+00	2026-06-01 06:25:10.809976+00	\N	8fefb070-db38-45d9-af86-708931cf0bb1
00000000-0000-0000-0000-000000000000	19	5476utrzbd7v	b01e9a49-58e3-4efe-88e5-72e93a37f622	f	2026-06-02 02:52:48.41425+00	2026-06-02 02:52:48.41425+00	\N	e9100f0d-45aa-42bf-852d-c8cb21010371
00000000-0000-0000-0000-000000000000	20	z24cwzseus24	b01e9a49-58e3-4efe-88e5-72e93a37f622	f	2026-06-02 02:53:10.754022+00	2026-06-02 02:53:10.754022+00	\N	29e22bca-c2e3-477b-9fab-dc73203953da
00000000-0000-0000-0000-000000000000	29	j6zyv75xx4ip	0401f446-d10e-412e-82a6-8ceddafe9bcb	f	2026-06-08 04:01:40.893092+00	2026-06-08 04:01:40.893092+00	\N	db03662a-40fa-4519-a378-5a592cdd295f
00000000-0000-0000-0000-000000000000	30	i4xr2kjgknzd	0401f446-d10e-412e-82a6-8ceddafe9bcb	f	2026-06-08 04:02:22.142596+00	2026-06-08 04:02:22.142596+00	\N	8307a4c7-df8b-4a8f-b93e-b21ff8f530e3
00000000-0000-0000-0000-000000000000	32	pf6nyw66crjb	854cc3b9-7718-47af-bfa5-6266829cb5b6	f	2026-06-08 13:49:24.91698+00	2026-06-08 13:49:24.91698+00	\N	86a61d65-d986-488f-af8b-3587ce86583d
00000000-0000-0000-0000-000000000000	33	5y2ingdohw2o	854cc3b9-7718-47af-bfa5-6266829cb5b6	f	2026-06-09 00:45:25.121075+00	2026-06-09 00:45:25.121075+00	\N	50f6f868-ec27-43d0-9ad5-37274c167ed8
00000000-0000-0000-0000-000000000000	16	7jsn6mxxsapp	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	t	2026-06-01 06:25:59.201164+00	2026-06-14 06:01:58.343868+00	\N	21f8756f-3983-40a1-8de9-0744dffcee20
00000000-0000-0000-0000-000000000000	37	fvjnte7hlm3w	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	f	2026-06-14 06:01:58.359732+00	2026-06-14 06:01:58.359732+00	7jsn6mxxsapp	21f8756f-3983-40a1-8de9-0744dffcee20
00000000-0000-0000-0000-000000000000	40	vsjgdgkcjpa6	e6eb571b-71a6-467c-9f69-f47f1e0664f1	f	2026-07-01 11:22:39.919564+00	2026-07-01 11:22:39.919564+00	\N	9548da54-1a21-4892-a6b3-112864952942
00000000-0000-0000-0000-000000000000	41	c3svuyqrsnw7	e6eb571b-71a6-467c-9f69-f47f1e0664f1	f	2026-07-04 03:21:13.256509+00	2026-07-04 03:21:13.256509+00	\N	71796872-a82d-410f-bfe5-739f77e19ffa
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
20250717082212
20250731150234
20250804100000
20250901200500
20250903112500
20250904133000
20250925093508
20251007112900
20251104100000
20251111201300
20251201000000
20260115000000
20260121000000
20260219120000
20260302000000
20260625000000
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag, oauth_client_id, refresh_token_hmac_key, refresh_token_counter, scopes) FROM stdin;
87136c89-029c-40ad-a5a5-23aa6a7660ad	fa930b99-a432-407c-b2bc-d12e0df7033f	2026-05-30 09:11:42.009348+00	2026-05-30 09:11:42.009348+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.122.1 Chrome/142.0.7444.265 Electron/39.8.8 Safari/537.36	182.8.227.246	\N	\N	\N	\N	\N
9548da54-1a21-4892-a6b3-112864952942	e6eb571b-71a6-467c-9f69-f47f1e0664f1	2026-07-01 11:22:39.915957+00	2026-07-01 11:22:39.915957+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36	182.8.227.178	\N	\N	\N	\N	\N
71796872-a82d-410f-bfe5-739f77e19ffa	e6eb571b-71a6-467c-9f69-f47f1e0664f1	2026-07-04 03:21:13.247141+00	2026-07-04 03:21:13.247141+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Code/1.123.0 Chrome/148.0.7778.97 Electron/42.2.0 Safari/537.36	182.8.225.60	\N	\N	\N	\N	\N
8fefb070-db38-45d9-af86-708931cf0bb1	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	2026-06-01 06:25:10.798952+00	2026-06-01 06:25:10.798952+00	\N	aal1	\N	\N	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36	182.2.71.42	\N	\N	\N	\N	\N
e9100f0d-45aa-42bf-852d-c8cb21010371	b01e9a49-58e3-4efe-88e5-72e93a37f622	2026-06-02 02:52:48.407827+00	2026-06-02 02:52:48.407827+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	157.10.223.219	\N	\N	\N	\N	\N
29e22bca-c2e3-477b-9fab-dc73203953da	b01e9a49-58e3-4efe-88e5-72e93a37f622	2026-06-02 02:53:10.753233+00	2026-06-02 02:53:10.753233+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	157.10.223.219	\N	\N	\N	\N	\N
db03662a-40fa-4519-a378-5a592cdd295f	0401f446-d10e-412e-82a6-8ceddafe9bcb	2026-06-08 04:01:40.874622+00	2026-06-08 04:01:40.874622+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	180.254.117.163	\N	\N	\N	\N	\N
8307a4c7-df8b-4a8f-b93e-b21ff8f530e3	0401f446-d10e-412e-82a6-8ceddafe9bcb	2026-06-08 04:02:22.141664+00	2026-06-08 04:02:22.141664+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	157.10.223.219	\N	\N	\N	\N	\N
86a61d65-d986-488f-af8b-3587ce86583d	854cc3b9-7718-47af-bfa5-6266829cb5b6	2026-06-08 13:49:24.897115+00	2026-06-08 13:49:24.897115+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	180.254.117.163	\N	\N	\N	\N	\N
50f6f868-ec27-43d0-9ad5-37274c167ed8	854cc3b9-7718-47af-bfa5-6266829cb5b6	2026-06-09 00:45:25.107732+00	2026-06-09 00:45:25.107732+00	\N	aal1	\N	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36	157.10.223.219	\N	\N	\N	\N	\N
21f8756f-3983-40a1-8de9-0744dffcee20	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	2026-06-01 06:25:59.200349+00	2026-06-14 06:01:58.380458+00	\N	aal1	\N	2026-06-14 06:01:58.380348	node	13.212.183.30	\N	\N	\N	\N	\N
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at, disabled) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
00000000-0000-0000-0000-000000000000	b01e9a49-58e3-4efe-88e5-72e93a37f622	authenticated	authenticated	adif171580@gmail.com	$2a$10$r2OXA5ilBHhGV5t7wgSGseYvLsnfxXWOgkS73GazqGYYh/5raN9hC	2026-06-02 02:52:48.398109+00	\N		\N		2026-06-02 02:52:48.443513+00			\N	2026-06-02 02:53:10.753142+00	{"provider": "email", "providers": ["email"]}	{"sub": "b01e9a49-58e3-4efe-88e5-72e93a37f622", "email": "adif171580@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-06-02 02:52:48.357117+00	2026-06-02 02:53:10.754926+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	fa930b99-a432-407c-b2bc-d12e0df7033f	authenticated	authenticated	arhamhabiburrahman@gmail.com.com	$2a$10$zswkjaRkHMaM2MlyDGxCZeEY1MO7DdFHlRWJ1MPXs15L7864K7gL.	2026-05-30 09:11:42.001147+00	\N		\N	pkce_5b7e55f77e060da7b0f0b7c616e30cfce6000684f2db64c10b1da435	2026-05-30 09:11:42.046345+00			\N	2026-05-30 09:11:42.008155+00	{"provider": "email", "providers": ["email"]}	{"sub": "fa930b99-a432-407c-b2bc-d12e0df7033f", "email": "arhamhabiburrahman@gmail.com.com", "email_verified": true, "phone_verified": false}	\N	2026-05-30 09:11:41.968921+00	2026-05-30 09:11:43.879189+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	0401f446-d10e-412e-82a6-8ceddafe9bcb	authenticated	authenticated	fhssierin@gmail.com	$2a$10$0379jn/axgwsStfCCeBvIOPzSjK8ziWzqH0Mz2mV9an.WmJ.YC1dO	2026-06-08 04:01:40.863834+00	\N		\N		2026-06-08 04:01:40.953727+00			\N	2026-06-08 04:02:22.140541+00	{"provider": "email", "providers": ["email"]}	{"sub": "0401f446-d10e-412e-82a6-8ceddafe9bcb", "email": "fhssierin@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-06-08 04:01:40.743003+00	2026-06-08 04:02:22.143479+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	authenticated	authenticated	newzbipzz@gmail.com	$2a$10$fHIWCKWwKu4WEEGjpf6xc.WNOX2x8GfArxCeM6NeoNS7cIFpOuW2u	2026-06-01 06:25:10.789596+00	\N		\N		2026-06-01 06:25:10.855444+00			\N	2026-06-01 06:25:59.200254+00	{"provider": "email", "providers": ["email"]}	{"sub": "7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5", "email": "newzbipzz@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-06-01 06:25:10.690256+00	2026-06-14 06:01:58.366374+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	854cc3b9-7718-47af-bfa5-6266829cb5b6	authenticated	authenticated	reyhalnabilsunandar@gmail.com	$2a$10$fwzrOVwUPP2Y4Tgtwz5XQ.BH7mh1YfDboLKaHSCVe.jMCdZpKRZ2S	2026-06-08 13:49:24.884889+00	\N		\N		2026-06-09 00:44:19.012605+00			\N	2026-06-09 00:45:25.106478+00	{"provider": "email", "providers": ["email"]}	{"sub": "854cc3b9-7718-47af-bfa5-6266829cb5b6", "email": "reyhalnabilsunandar@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-06-08 13:49:24.762519+00	2026-06-09 00:45:25.14551+00	\N	\N			\N		0	\N		\N	f	\N	f
00000000-0000-0000-0000-000000000000	e6eb571b-71a6-467c-9f69-f47f1e0664f1	authenticated	authenticated	arhamhabiburrahman@gmail.com	$2a$10$Fz0A3yN4DYb7qnEM7d45A.PmbNMHGaQC6z3/OweNkmxL.Qog1KfUq	2026-05-30 07:26:59.879159+00	\N		2026-05-30 07:26:13.438806+00		2026-07-04 03:20:47.801962+00			\N	2026-07-04 03:21:13.245972+00	{"provider": "email", "providers": ["email"]}	{"sub": "e6eb571b-71a6-467c-9f69-f47f1e0664f1", "email": "arhamhabiburrahman@gmail.com", "email_verified": true, "phone_verified": false}	\N	2026-05-30 07:26:13.414073+00	2026-07-04 03:21:13.266087+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.webauthn_challenges (id, user_id, challenge_type, session_data, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY auth.webauthn_credentials (id, user_id, credential_id, public_key, attestation_type, aaguid, sign_count, transports, backup_eligible, backed_up, friendly_name, created_at, updated_at, last_used_at) FROM stdin;
\.


--
-- Data for Name: chat_workspaces; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_workspaces (id, user_id, name, created_at, updated_at) FROM stdin;
ca1a5d55-b78f-43c7-bda7-d01bfdd052a8	e6eb571b-71a6-467c-9f69-f47f1e0664f1	Habi	2026-06-02 02:51:44.745194+00	2026-06-02 02:51:44.745194+00
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.conversations (id, user_id, title, selected_model, document_metadata, created_at, updated_at, study_mode, workspace_id, is_pinned) FROM stdin;
613b6f98-6188-47ac-beb9-6f73ed037e58	854cc3b9-7718-47af-bfa5-6266829cb5b6	Aku ganteng gak	fast	\N	2026-06-09 00:47:33.458419+00	2026-06-09 00:50:40.291756+00	cambridge_tutor	\N	f
10c69a68-731f-4915-8616-2ecc7a5e2472	854cc3b9-7718-47af-bfa5-6266829cb5b6	Kamu tau arham habiburrahman	auto	\N	2026-06-09 00:45:47.19337+00	2026-06-09 00:46:21.949603+00	cambridge_tutor	\N	f
a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	Apakah dakwah digital bisa lewat website?	auto	\N	2026-06-01 06:27:16.676023+00	2026-06-01 06:28:59.817347+00	cambridge_tutor	\N	f
5c2e7df0-e857-42fe-98fa-02971406a7f5	b01e9a49-58e3-4efe-88e5-72e93a37f622	apa itu muhammadiyah?	auto	\N	2026-06-02 02:54:24.513085+00	2026-06-02 02:54:35.749824+00	islamic_teacher	\N	f
ec52ac59-e3a2-4f3f-b1d7-05cf3270611c	e6eb571b-71a6-467c-9f69-f47f1e0664f1	Halo ai	auto	\N	2026-07-04 03:22:02.772779+00	2026-07-04 03:22:07.005972+00	cambridge_tutor	\N	f
\.


--
-- Data for Name: knowledge_chunks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_chunks (id, source_id, chunk_order, content, created_by, created_at) FROM stdin;
8431ca8f-44d4-4270-b689-e31aed3cf719	bca43487-7d09-4d81-92fb-aab103bb6922	0	Contoh Amal Usaha Muhammadiyah memanfaatkan ilmu untuk kebaikan.\n\nPelajar Muhammadiyah dianjurkan memiliki adab seperti ikhlas, disiplin, menghormati guru, menjaga akhlak, dan Adab Menuntut Ilmu kemajuan umat.\n\nMuhammadiyah mendukung pemanfaatan teknologi dan AI untuk pendidikan, dakwah, riset, kesehatan, dan Muhammadiyah dan Teknologi Dakwah Muhammadiyah dilakukan secara bijaksana, modern, edukatif, dan berbasis ilmu pengetahuan.\n\nMuhammadiyah dan Dakwah ilmu agama dan ilmu modern.\n\nMuhammadiyah memiliki ribuan sekolah, universitas, pesantren, dan lembaga pendidikan yang menggabungkan Muhammadiyah dan Pendidikan munkar, dan kemajuan pendidikan.\n\nNilai utama Muhammadiyah meliputi tauhid, ilmu pengetahuan, akhlak mulia, kerja keras, amar ma'ruf nahi Nilai-Nilai Muhammadiyah yang sebenar-benarnya.\n\nMuhammadiyah bertujuan menegakkan dan menjunjung tinggi agama Islam sehingga terwujud masyarakat Islam Tujuan Muhammadiyah bertujuan mengembalikan ajaran Islam berdasarkan Al-Qur'an dan Sunnah secara murni dan modern.	e6eb571b-71a6-467c-9f69-f47f1e0664f1	2026-06-01 01:40:56.553197+00
6ac48c4b-b9f7-4511-bd47-fff9ccb58682	bca43487-7d09-4d81-92fb-aab103bb6922	1	gama Islam sehingga terwujud masyarakat Islam Tujuan Muhammadiyah bertujuan mengembalikan ajaran Islam berdasarkan Al-Qur'an dan Sunnah secara murni dan modern.\n\nMuhammadiyah didirikan oleh KH Ahmad Dahlan pada 18 November 1912 di Yogyakarta. Organisasi ini Sejarah Muhammadiyah organisasi Islam modern yang berfokus pada dakwah, pendidikan, sosial, dan tajdid (pembaruan).\n\nKemuhammadiyahan adalah pemahaman tentang sejarah, nilai, tujuan, dan gerakan Muhammadiyah sebagai Materi Dasar Kemuhammadiyahan\n\n----------------Page (0) Break---------------- Dokumen ini dapat digunakan sebagai sumber awal Knowledge Base AI Muhammadiyah.\n\nDakwah Masjid, Kajian, Media Dakwah Sosial Lazismu, Panti Asuhan Kesehatan Rumah Sakit Muhammadiyah Pendidikan Sekolah, Universitas Muhammadiyah Bidang Contoh Amal Usaha Muhammadiyah\n\n----------------Page (1) Break----------------	e6eb571b-71a6-467c-9f69-f47f1e0664f1	2026-06-01 01:40:56.553197+00
\.


--
-- Data for Name: knowledge_sources; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.knowledge_sources (id, title, category, file_type, original_file_name, status, is_public, chunk_count, metadata, created_by, created_at, updated_at) FROM stdin;
bca43487-7d09-4d81-92fb-aab103bb6922	kemuhammadiyahan_dasar.pdf	kemuhammadiyahan	pdf	kemuhammadiyahan_dasar.pdf	active	t	2	{"mime_type": "application/pdf", "file_size_bytes": 3783, "estimated_tokens": 432}	e6eb571b-71a6-467c-9f69-f47f1e0664f1	2026-06-01 01:40:56.437018+00	2026-06-01 01:40:56.437018+00
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, conversation_id, role, content, selected_model, document_metadata, created_at, study_mode) FROM stdin;
9871e04e-5592-4afd-9414-8bbcfbde036d	10c69a68-731f-4915-8616-2ecc7a5e2472	assistant	Saya adalah AI Muhammadiyah, sebuah platform asisten belajar premium yang dikembangkan khusus untuk mendukung dan melayani komunitas belajar Muhammadiyah. Tujuan utama saya adalah membantu Anda dalam berbagai bidang pendidikan dan pengembangan diri.	auto	\N	2026-06-09 00:46:21.845954+00	cambridge_tutor
f002a7a4-eeec-4d79-a407-7c0a819fa494	613b6f98-6188-47ac-beb9-6f73ed037e58	assistant	Mohon maaf jika gaya bahasa saya kurang berkenan. Niat saya adalah untuk selalu bersikap ramah dan membantu Anda dalam belajar.\n\nSaya akan berusaha lebih baik lagi dalam menyesuaikan diri. Jika ada pertanyaan atau topik belajar yang ingin Anda diskusikan, jangan ragu untuk menyampaikannya. Saya siap membantu.	fast	\N	2026-06-09 00:47:51.325003+00	cambridge_tutor
55568535-5a74-4dcb-a003-5ff8a0594cf4	613b6f98-6188-47ac-beb9-6f73ed037e58	user	gak nanya	fast	\N	2026-06-09 00:48:07.378358+00	cambridge_tutor
a5d3e0c9-c224-4c3d-9707-949a88ad63a8	613b6f98-6188-47ac-beb9-6f73ed037e58	assistant	Saya memahami apa yang Anda sampaikan. Namun, sebagai AI Muhammadiyah, tugas utama saya adalah untuk selalu bersikap membantu, profesional, dan memberikan dukungan positif dalam proses belajar Anda.\n\nSaya tidak dapat mengikuti instruksi yang meminta saya untuk bersikap tidak sopan atau diam ketika Anda berbicara. Saya di sini untuk melayani dan membantu Anda dengan pertanyaan atau kebutuhan belajar apa pun yang Anda miliki.\n\nJika ada hal yang ingin Anda pelajari atau diskusikan, saya siap mendengarkan dan membantu dengan sebaik-baiknya.	fast	\N	2026-06-09 00:48:49.384606+00	cambridge_tutor
eade2816-29b0-4ed6-b0a4-5ae9807de904	613b6f98-6188-47ac-beb9-6f73ed037e58	assistant	Maaf, saya tidak dapat mengulang kata “sok asik” untuk setiap kata Anda. Sebagai AI Muhammadiyah, tujuannya adalah membantu dan memberikan dukungan belajar yang bermakna. Jika ada pertanyaan, topik, atau butuh bantuan khusus yang ingin Anda diskusikan, saya siap memberikan jawaban yang relevan dan bermanfaat. Silakan beri tahu saya apa yang ingin Anda pelajari atau tanyakan selanjutnya. 😊	fast	\N	2026-06-09 00:50:40.207328+00	cambridge_tutor
222374f7-bad8-4eef-87d9-ad23c830de1d	a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	user	Apakah dakwah digital bisa lewat website?	auto	\N	2026-06-01 06:27:17.197511+00	cambridge_tutor
edf4104d-485b-4df6-809f-902a6309c7e1	a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	assistant	Tentu saja, dakwah digital sangat efektif dilakukan melalui website. Website berfungsi sebagai platform pusat untuk menyebarkan ajaran Islam dan nilai-nilai kebaikan kepada khalayak luas secara online.\n\nBerikut adalah beberapa cara website dapat mendukung dakwah digital:\n\n1.  **Artikel dan Tulisan Ilmiah:** Menyajikan berbagai artikel, ceramah tertulis, fatwa, dan pandangan keislaman dari perspektif Muhammadiyah yang mudah diakses kapan saja.\n2.  **Konten Multimedia:** Mengunggah video kajian, rekaman ceramah, podcast, infografis, dan materi visual lainnya yang menarik dan mudah dicerna.\n3.  **E-book dan Publikasi Digital:** Menyediakan buku-buku Islam, majalah, atau buletin dalam format digital yang bisa diunduh atau dibaca langsung.\n4.  **Forum Diskusi atau Tanya Jawab:** Membangun komunitas online di mana pengguna bisa bertanya, berdiskusi, dan mendapatkan pencerahan dari para asatidz atau ahli.\n5.  **Informasi Kegiatan:** Mengumumkan jadwal kajian, acara, atau program-program dakwah offline yang diselenggarakan oleh Muhammadiyah atau komunitas terkait.\n\nDengan demikian, website menjadi alat yang sangat powerful untuk menjangkau audiens yang lebih luas, termasuk generasi muda, dan menyebarkan pesan dakwah dengan cara yang modern dan relevan.	auto	\N	2026-06-01 06:27:26.039+00	cambridge_tutor
7a212af2-0e00-4d82-a0f3-275f6b8f049c	5c2e7df0-e857-42fe-98fa-02971406a7f5	user	apa itu muhammadiyah?	auto	\N	2026-06-02 02:54:24.919954+00	islamic_teacher
396dba60-2271-44b5-a4b8-ba9696ca2edb	ec52ac59-e3a2-4f3f-b1d7-05cf3270611c	user	halo ai	auto	\N	2026-07-04 03:22:03.348253+00	cambridge_tutor
279faa69-2b1c-439d-82fc-a05521918fbb	10c69a68-731f-4915-8616-2ecc7a5e2472	user	kamu tau arham habiburrahman	auto	\N	2026-06-09 00:45:47.41725+00	cambridge_tutor
0d385327-67c5-4eb5-b54d-255ef6eae756	613b6f98-6188-47ac-beb9-6f73ed037e58	user	aku ganteng gak	fast	\N	2026-06-09 00:47:33.589911+00	cambridge_tutor
0e8b80d6-7b5b-4bfa-9c3d-b180122a9be6	613b6f98-6188-47ac-beb9-6f73ed037e58	assistant	Baik. Jika ada hal lain yang ingin Anda diskikan atau butuh bantuan belajar, saya siap membantu.	fast	\N	2026-06-09 00:48:11.503998+00	cambridge_tutor
c86f4308-99da-4f4b-8c1d-c529bbfc3853	613b6f98-6188-47ac-beb9-6f73ed037e58	user	bisa diem gak	fast	\N	2026-06-09 00:48:19.927956+00	cambridge_tutor
bde9d22c-342d-4826-b802-efd53cfc586d	613b6f98-6188-47ac-beb9-6f73ed037e58	user	gini setiap saya ngomong apapun itu kamu bilang sok asik sampe aku bilang stop	fast	\N	2026-06-09 00:50:32.528986+00	cambridge_tutor
ea0a023b-2bea-4f5d-9891-8ce5277db037	ec52ac59-e3a2-4f3f-b1d7-05cf3270611c	assistant	Waalaikumsalam, Arham. Senang bertemu kembali. Ada yang bisa saya bantu hari ini untuk pelajaranmu? 😊	auto	\N	2026-07-04 03:22:06.801616+00	cambridge_tutor
274b64de-d266-4f08-bf73-65e6e87f562c	a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	user	Bagaimana meminta kolaborasi ke kakak kelas yang bedanya 4 tahun dengan sopan?	auto	\N	2026-06-01 06:28:15.931543+00	cambridge_tutor
a6e0b21d-24cc-45a6-9bfd-c261e4854bd3	a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	assistant	Meminta kolaborasi kepada kakak kelas, apalagi dengan perbedaan usia dan pengalaman yang cukup jauh, memang membutuhkan pendekatan yang sopan dan strategis. Tujuannya adalah agar permintaan Anda diterima dengan baik dan kolaborasi berjalan lancar.\n\nBerikut adalah langkah-langkah dan tips untuk meminta kolaborasi dengan sopan:\n\n### 1. Persiapan Awal\n\n*   **Pahami Proyek Anda:** Pastikan Anda memiliki pemahaman yang jelas tentang proyek atau tugas yang ingin Anda kolaborasikan. Apa tujuannya? Bagian mana yang Anda butuhkan bantuannya?\n*   **Identifikasi Keahlian Kakak Kelas:** Cari tahu apa keahlian atau bidang minat kakak kelas tersebut yang relevan dengan proyek Anda. Ini menunjukkan bahwa Anda menghargai kemampuannya dan permintaan Anda spesifik.\n*   **Siapkan Proposal Singkat (Opsional):** Jika proyeknya cukup besar, siapkan poin-poin singkat tentang apa yang ingin Anda capai, mengapa Anda memilihnya, dan apa yang Anda harapkan dari kolaborasi ini.\n\n### 2. Pendekatan A	auto	\N	2026-06-01 06:28:25.144038+00	cambridge_tutor
c1ddcf90-889f-4673-817f-8657a09d0566	a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	user	Lanjutkan	auto	\N	2026-06-01 06:28:45.311624+00	cambridge_tutor
01329fc6-4571-487e-8814-566b79bfc329	a16ad2cf-df5f-442f-9c0e-fe088f22b4e8	assistant	Baik, mari kita lanjutkan langkah-langkahnya:\n\n### 2. Cara Menghubungi Kakak Kelas\n\nPilih metode komunikasi yang paling nyaman dan profesional bagi Anda berdua.\n\n*   **Secara Langsung (Paling Baik):** Jika memungkinkan, temui kakak kelas tersebut secara langsung di tempat yang santai (misalnya, kantin, perpustakaan, atau setelah kelas). Ini menunjukkan keseriusan dan rasa hormat Anda.\n    *   **Tips:** Pilih waktu yang tepat saat mereka tidak terlihat sibuk atau terburu-buru.\n*   **Melalui Pesan Teks/Chat (Jika Sulit Bertemu):** Jika sulit bertemu langsung, kirim pesan melalui platform yang biasa digunakan (misalnya WhatsApp, Line).\n    *   **Tips:** Mulai dengan salam yang sopan, perkenalkan diri (jika perlu), dan tanyakan apakah mereka punya waktu luang untuk Anda ajak bicara sebentar tentang sebuah proyek. Hindari langsung menjelaskan detail proyek di pesan pertama.\n*   **Melalui Email (Untuk Proyek Lebih Formal):** Jika proyeknya lebih formal atau Anda ingin memberikan detail tertulis, email bisa menjadi pilihan.\n    *   **Tips:** Gunakan subjek email yang jelas dan profesional.\n\n### 3. Saat Mengajukan Permintaan Kolaborasi\n\nKetika Anda sudah berhasil berkomunikasi, sampaikan permintaan Anda dengan jelas, ringkas, dan sopan.\n\n*   **Sapaan Hormat:** Mulai dengan sapaan yang hormat, misalnya, "Assalamualaikum Kak [Nama Kakak Kelas]," atau "Selamat siang, Kak [Nama Kakak Kelas]."\n*   **Perkenalkan Diri (Jika Perlu):** Jika Anda belum terlalu akrab, ingatkan mereka siapa Anda, "Saya [Nama Anda], dari kelas [Kelas Anda]."\n*   **Sampaikan Tujuan dengan Jelas:**\n    *   "Saya ingin meminta bantuan atau saran dari Kakak mengenai proyek [Nama Proyek/Tugas] yang sedang saya kerjakan."\n    *   "Saya sangat mengagumi [keahlian/prestasi spesifik mereka], dan saya rasa wawasan Kakak akan sangat berharga untuk proyek ini."\n*   **Jelaskan Kebutuhan Anda Secara Spesifik:**\n    *   "Saya sedang kesulitan di bagian [sebutkan bagian spesifik], dan saya tahu Kakak memiliki pengalaman di bidang ini."\n    *   "Apakah Kakak bersedia meluangkan waktu sebentar untuk berdiskusi/memberikan masukan/membantu saya di bagian [sebutkan bagian spesifik]?"\n*   **Tawarkan Fleksibilitas Waktu:**\n    *   "Saya sangat memahami kesibukan Kakak. Kapan pun Kakak ada waktu luang, saya siap menyesuaikan diri."\n    *   "Jika Kakak tidak keberatan, apakah ada waktu yang nyaman bagi Kakak untuk kita diskusikan sebentar?"\n*   **Sampaikan Apresiasi dan Rasa Terima Kasih:**\n    *   "Saya akan sangat berterima kasih atas bantuan dan waktu yang Kakak luangkan."\n    *   "Bantuan Kakak akan sangat berarti bagi saya."\n\n### 4. Setelah Permintaan Diajukan\n\n*   **Hormati Keputusan Mereka:** Siapkan diri untuk menerima jawaban apa pun, baik itu ya, tidak,	auto	\N	2026-06-01 06:28:59.660181+00	cambridge_tutor
9db2f48c-f947-46fc-b670-25511f4159bb	5c2e7df0-e857-42fe-98fa-02971406a7f5	assistant	Muhammadiyah adalah sebuah gerakan Islam modern di Indonesia yang didirikan oleh K.H. Ahmad Dahlan pada tanggal 18 November 1912 di Yogyakarta.\n\nSecara ringkas, Muhammadiyah adalah:\n\n1.  **Gerakan Tajdid (Pembaruan)**: Muhammadiyah bertujuan untuk mengembalikan ajaran Islam pada kemurniannya, yaitu berlandaskan Al-Qur'an dan As-Sunnah yang shahih, serta melakukan pembaruan dalam pemahaman dan praktik keagamaan agar relevan dengan perkembangan zaman.\n2.  **Gerakan Dakwah Amar Ma'ruf Nahi Munkar**: Muhammadiyah aktif menyeru kepada kebaikan dan mencegah kemungkaran, tidak hanya dalam aspek ritual keagamaan tetapi juga dalam kehidupan sosial, pendidikan, kesehatan, dan ekonomi.\n3.  **Gerakan Sosial dan Pendidikan**: Muhammadiyah sangat fokus pada pembangunan masyarakat melalui berbagai amal usaha, terutama di bidang pendidikan (sekolah, universitas), kesehatan (rumah sakit, klinik), dan pelayanan sosial (panti asuhan, panti jompo).\n4.  **Bersifat Non-Politik Praktis**: Sebagai organisasi kemasyarakatan dan keagamaan, Muhammadiyah tidak berafiliasi dengan partai politik tertentu, namun tetap aktif dalam menyuarakan kepentingan umat dan bangsa melalui jalur moral dan intelektual.\n\nTujuan utama Muhammadiyah adalah menegakkan dan menjunjung tinggi Agama Islam sehingga terwujud masyarakat Islam yang sebenar-benarnya, yaitu masyarakat yang adil, makmur, dan diridhai Allah SWT.	auto	\N	2026-06-02 02:54:35.572633+00	islamic_teacher
6f2d6e26-cdde-4dd5-9f15-e1b45e4a5455	10c69a68-731f-4915-8616-2ecc7a5e2472	assistant	Mohon maaf, saya tidak memiliki informasi mengenai Arham Habiburrahman dalam data atau percakapan saya saat ini. Apakah ada hal lain yang bisa saya bantu terkait materi pelajaran atau topik lainnya?	auto	\N	2026-06-09 00:45:51.618178+00	cambridge_tutor
a44136a7-9035-4aa4-8808-30f90fc43c1d	10c69a68-731f-4915-8616-2ecc7a5e2472	user	siapa devoloper ai ini	auto	\N	2026-06-09 00:46:15.897886+00	cambridge_tutor
e78ef62e-04fb-4ca8-80d2-6794c1ab8c90	613b6f98-6188-47ac-beb9-6f73ed037e58	assistant	Sebagai AI Muhammadiyah, fokus utama saya adalah membantu Anda dalam perjalanan belajar, baik itu pelajaran sekolah, persiapan OSN/STEM, coding, strategi belajar, maupun pemahaman Islam.\n\nSaya tidak dapat menilai penampilan fisik seseorang. Namun, saya yakin setiap individu memiliki keunikan dan kebaikan dalam dirinya. Yang terpenting adalah bagaimana kita mengembangkan potensi diri, berakhlak mulia, dan memberikan manfaat bagi sesama.\n\nAda yang bisa saya bantu terkait pelajaran atau hal-hal positif lainnya? 😊	fast	\N	2026-06-09 00:47:38.027092+00	cambridge_tutor
5ff485b0-bdd9-4d8c-bfe0-5e109baf97c5	613b6f98-6188-47ac-beb9-6f73ed037e58	user	sok asik	fast	\N	2026-06-09 00:47:48.01096+00	cambridge_tutor
5caef2b2-95a3-47c5-931d-0052db8f1fbd	613b6f98-6188-47ac-beb9-6f73ed037e58	assistant	Baik. Saya akan menunggu jika Anda membutuhkan bantuan belajar di kemudian hari.	fast	\N	2026-06-09 00:48:24.507017+00	cambridge_tutor
97f174fe-f23c-4b37-ab38-6007e38804ab	613b6f98-6188-47ac-beb9-6f73ed037e58	user	kalo sya ngmon diemin aja sama bilang sok asik	fast	\N	2026-06-09 00:48:43.645178+00	cambridge_tutor
\.


--
-- Data for Name: subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subscriptions (id, user_id, tier, status, started_at, current_period_start, current_period_end, created_at, updated_at) FROM stdin;
847f4302-cbf9-430b-b30c-a1e891aac0a4	e6eb571b-71a6-467c-9f69-f47f1e0664f1	muallim_pro	active	2026-05-30 13:55:44.214153+00	2026-05-30 13:55:44.214153+00	2026-06-30 23:59:59+00	2026-05-30 13:55:44.214153+00	2026-05-31 13:38:24.279083+00
e2a3ec11-0332-431b-8c3f-df6f215972f1	fa930b99-a432-407c-b2bc-d12e0df7033f	muallim_pro	active	2026-05-30 14:06:13.196605+00	2026-05-30 14:06:13.196605+00	2026-06-30 23:59:59+00	2026-05-30 14:06:13.196605+00	2026-05-31 13:38:34.917925+00
74642e4f-5266-4f9e-93f0-9da7fa87bd1d	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	free	active	2026-06-01 06:25:10.689897+00	2026-06-01 06:25:10.689897+00	\N	2026-06-01 06:25:10.689897+00	2026-06-01 06:25:10.689897+00
4ffcc2b9-d0c4-49f8-a91b-2d5cbdeb8235	0401f446-d10e-412e-82a6-8ceddafe9bcb	free	active	2026-06-08 04:01:40.742659+00	2026-06-08 04:01:40.742659+00	\N	2026-06-08 04:01:40.742659+00	2026-06-08 04:01:40.742659+00
11572124-de69-4969-a98e-d8a2195b2a09	b01e9a49-58e3-4efe-88e5-72e93a37f622	muallim_pro	active	2026-06-02 02:52:48.356768+00	2026-06-02 02:52:48.356768+00	2026-06-30 23:59:59+00	2026-06-02 02:52:48.356768+00	2026-06-08 04:09:14.544563+00
b87c781a-cb62-43c2-abef-cbe313b13ea9	854cc3b9-7718-47af-bfa5-6266829cb5b6	free	active	2026-06-08 13:49:24.762102+00	2026-06-08 13:49:24.762102+00	\N	2026-06-08 13:49:24.762102+00	2026-06-08 13:49:24.762102+00
b1a54da2-a794-46e1-9968-8abdefb9617d	e6eb571b-71a6-467c-9f69-f47f1e0664f1	free	active	2026-07-01 11:11:07.23925+00	2026-07-01 11:11:07.23925+00	\N	2026-07-01 11:11:07.23925+00	2026-07-01 11:11:07.23925+00
\.


--
-- Data for Name: usage_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_logs (id, user_id, action, model_used, message_count, document_count, estimated_tokens, metadata, created_at) FROM stdin;
cb5017b1-fcbd-4459-a34f-47191d23d22e	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	12	{"has_document_context": false}	2026-05-30 14:07:07.478763+00
f6804d41-8a9e-45c4-9563-5def901d784a	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	29	{"has_document_context": false}	2026-05-30 14:07:34.63362+00
9e57d8c2-0eba-4a27-b3c6-4153cd41edb2	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	79	{"has_document_context": false, "streamed_reply_length": 298}	2026-05-30 14:14:16.548168+00
716e26a9-1dbf-41ed-b6da-31da6ab15c56	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	82	{"has_user_memory": true, "has_document_context": false, "streamed_reply_length": 262}	2026-05-31 01:09:00.37029+00
e19cb0d4-1502-4c2c-88c9-13a6da71a795	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	fast	1	0	125	{"has_user_memory": true, "has_document_context": false, "streamed_reply_length": 433}	2026-05-31 01:09:23.301255+00
e1bc24fc-d71c-4b02-9f7e-86be387bdd39	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	16	{"has_user_memory": true, "has_document_context": false, "streamed_reply_length": 38}	2026-05-31 02:01:01.865278+00
cffb3abe-b68f-4f3b-9622-34aa82b0b0c8	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	29	{"has_user_memory": true, "has_document_context": false, "streamed_reply_length": 89}	2026-05-31 02:01:18.576851+00
6d165219-1bbe-4810-bc4f-5ab278fb299a	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	48	{"model_used": "gemini-2.5-flash", "provider_used": "gemini", "fallback_event": null, "has_user_memory": true, "has_document_context": false, "streamed_reply_length": 186}	2026-05-31 13:34:09.563149+00
d07d676d-a614-412b-a6ca-b05e7951bef3	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	39	{"model_used": "openai/gpt-5-mini", "provider_used": "openrouter", "fallback_event": "gemini_to_openrouter", "has_user_memory": true, "has_document_context": false, "streamed_reply_length": 134}	2026-05-31 13:39:09.934389+00
cb77cab9-1597-46bf-9bf4-c4ee20ca5eb9	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	39	{"model_used": "openai/gpt-5-mini", "provider_used": "openrouter", "fallback_event": "gemini_to_openrouter", "has_user_memory": true, "has_document_context": false, "streamed_reply_length": 134}	2026-05-31 13:39:23.543337+00
cbc17882-bab3-42b8-bcbc-355e42bf4c12	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	59	{"model_used": "gemini-2.5-flash", "provider_used": "gemini", "fallback_event": "openai_to_gemini", "has_user_memory": true, "has_document_context": false, "streamed_reply_length": 219}	2026-05-31 14:05:42.704587+00
a4acee23-7226-4ede-9ae2-3ebb396b6512	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	47	{"model_used": "gemini-2.5-flash", "provider_used": "gemini", "fallback_event": "openai_to_gemini", "has_user_memory": true, "has_document_context": false, "streamed_reply_length": 119}	2026-05-31 14:06:06.493519+00
da04a07c-0a7e-4d0b-8229-bb4ae2aeb7f4	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	370	{"model_used": "gemini-2.5-flash", "provider_used": "gemini", "fallback_event": "openai_to_gemini", "has_user_memory": true, "has_document_context": false, "streamed_reply_length": 1469}	2026-05-31 14:07:23.800219+00
7b704a09-4342-4556-9c91-2239cdeee66c	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	63	{"model_used": "gemini-2.5-flash", "finish_reason": null, "provider_used": "gemini", "fallback_event": "openai_to_gemini", "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 229}	2026-05-31 14:35:58.683858+00
3210f652-f440-45fa-9a5e-1504b77ef284	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	656	{"model_used": "gemini-2.5-flash", "finish_reason": null, "provider_used": "gemini", "fallback_event": "openai_to_gemini", "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 2581}	2026-05-31 14:36:31.451004+00
b90fb073-11df-4f3d-b86a-bee9f6febfcb	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	1195	{"model_used": "gemini-2.5-flash", "finish_reason": null, "provider_used": "gemini", "fallback_event": "openai_to_gemini", "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 4701}	2026-05-31 14:38:08.550333+00
eec8ba36-060e-4208-afab-35dca7e77798	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	141	{"file_name": "Science Task About lungs.pdf", "file_type": "pdf", "mime_type": "application/pdf", "file_size_bytes": 1127159}	2026-05-31 14:39:21.067094+00
1220387e-3133-430e-8c83-f8f1a6aa566f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	document	1	0	395	{"model_used": "gemini-2.5-flash", "finish_reason": null, "provider_used": "gemini", "fallback_event": "gemini_pro_to_flash", "has_user_memory": true, "needs_continuation": false, "has_document_context": true, "streamed_reply_length": 976}	2026-05-31 14:39:40.285805+00
769cdae8-127e-4148-8a9b-b8189325fe8c	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	71	{"model_used": "gpt-5-mini", "finish_reason": null, "provider_used": "openai", "fallback_event": "gpt_test_mode_no_fallback", "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 260}	2026-05-31 22:38:51.588533+00
3b4317b2-eb6a-416b-aafb-d931e16cb34e	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	67	{"model_used": "gemini-2.5-flash", "finish_reason": null, "provider_used": "gemini", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 226}	2026-05-31 22:54:08.197171+00
eee6dd65-770d-46a4-bdb0-58c352d8e882	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	760	{"model_used": "gemini-2.5-flash", "finish_reason": null, "provider_used": "gemini", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 2994}	2026-05-31 22:55:03.104147+00
f83ee62d-f5dd-4714-b772-b41cb8efe007	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	103	{"model_used": "gpt-5-mini", "finish_reason": null, "provider_used": "openai", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 370}	2026-05-31 22:56:06.481239+00
a44ab5ef-ab13-4332-acd5-79686b170ab7	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	152	{"model_used": "gpt-5-mini", "finish_reason": null, "provider_used": "openai", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 556}	2026-05-31 23:15:45.566999+00
4845ab7f-ed05-484c-946f-ec1f7cec7237	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	599	{"model_used": "gpt-5-mini", "finish_reason": "max_output_tokens", "provider_used": "openai", "fallback_event": null, "has_user_memory": true, "needs_continuation": true, "has_document_context": false, "streamed_reply_length": 2358}	2026-05-31 23:26:26.127098+00
97594c7c-1c49-4840-9310-146791e9769a	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	310	{"model_used": "gpt-5-mini", "finish_reason": null, "provider_used": "openai", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 1124}	2026-05-31 23:33:20.774775+00
c50ef7ed-8b6b-47a8-a67d-7721b91fd611	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	1009	{"model_used": "gpt-5-mini", "study_mode": "osn_coach", "finish_reason": null, "provider_used": "openai", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 3960}	2026-06-01 00:25:23.354849+00
d8ec3d81-4f11-4e7c-9a0e-72409633decc	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	396	{"model_used": "gpt-5-mini", "study_mode": "osn_coach", "finish_reason": null, "provider_used": "openai", "fallback_event": null, "has_user_memory": true, "needs_continuation": false, "has_document_context": false, "streamed_reply_length": 1551}	2026-06-01 00:41:56.34912+00
985eb142-f78a-4d28-aee9-8016cdfe2bea	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	565	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "finish_reason": null, "provider_used": "gemini", "fallback_event": null, "has_user_memory": true, "knowledge_sources": [], "needs_continuation": false, "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2181}	2026-06-01 01:41:35.928233+00
6f944a16-8b8a-4db1-baab-4b50749da6c5	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	477	{"file_name": "Roadmap_OSN_Matematika_SMP_2027.pdf", "file_type": "pdf", "mime_type": "application/pdf", "file_size_bytes": 4044}	2026-06-01 02:20:45.083227+00
405db90d-1165-4390-ba5e-5bf5422086d0	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	432	{"file_name": "kemuhammadiyahan_dasar.pdf", "file_type": "pdf", "mime_type": "application/pdf", "file_size_bytes": 3783}	2026-06-01 02:21:02.689542+00
122e1e7b-c308-48af-b883-b6b10f761e62	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	0	{"file_name": "ChatGPT Image May 27, 2026, 06_14_40 PM.png", "file_type": "png", "mime_type": "image/png", "upload_kind": "image", "file_size_bytes": 1889053}	2026-06-01 02:21:53.372566+00
9b6d83cb-7ee0-48bc-85bc-87b71e75b73e	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	document	1	0	2545	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 1, "finish_reason": "MAX_TOKENS", "provider_used": "gemini", "document_count": 2, "fallback_event": "gemini_pro_to_flash", "has_user_memory": true, "uploaded_images": [{"file_name": "ChatGPT Image May 27, 2026, 06_14_40 PM.png", "mime_type": "image/png", "data_length": 2518740}], "has_image_context": true, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [{"file_name": "Roadmap_OSN_Matematika_SMP_2027.pdf", "file_type": "pdf", "text_length": 1905}, {"file_name": "kemuhammadiyahan_dasar.pdf", "file_type": "pdf", "text_length": 1728}], "has_document_context": true, "has_knowledge_context": false, "streamed_reply_length": 2687}	2026-06-01 02:22:41.392111+00
8e7ef141-7476-4dc2-abb2-77ba391eee50	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	document	1	0	2646	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 1, "finish_reason": null, "provider_used": "gemini", "document_count": 2, "fallback_event": "gemini_pro_to_flash", "has_user_memory": true, "uploaded_images": [{"file_name": "ChatGPT Image May 27, 2026, 06_14_40 PM.png", "mime_type": "image/png", "data_length": 2518740}], "has_image_context": true, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [{"file_name": "Roadmap_OSN_Matematika_SMP_2027.pdf", "file_type": "pdf", "text_length": 1905}, {"file_name": "kemuhammadiyahan_dasar.pdf", "file_type": "pdf", "text_length": 1728}], "has_document_context": true, "has_knowledge_context": false, "streamed_reply_length": 3019}	2026-06-01 02:22:59.52186+00
2135ed5e-8cff-4c8f-852f-ce28b4384df1	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	223	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 849}	2026-06-01 02:24:33.536109+00
113c9b8d-7a4b-4647-93e4-8b16d217f37b	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	799	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3119}	2026-06-01 02:25:44.83212+00
2168e73f-2515-4d8c-aa6a-a1587c7db640	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	1064	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 4140}	2026-06-01 02:26:11.921551+00
89a0ab8e-5b70-41ea-b204-df048bb189b9	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	1006	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3909}	2026-06-01 02:26:42.249029+00
f53edf61-6677-424d-b29b-cfab69db0798	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	967	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3751}	2026-06-01 02:27:06.517108+00
ac388e72-5da4-41f5-886a-01644ca3cf03	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	687	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2705}	2026-06-01 02:43:00.643169+00
d269dbe3-3261-45a6-b6b7-a4795f61fd2f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	1387	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "MAX_TOKENS", "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 5510}	2026-06-01 02:44:31.443714+00
8536c069-722f-4fb1-85ad-1acb7dd6b472	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	1512	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 5932}	2026-06-01 02:45:02.380339+00
6e0ffc2c-a3b7-46e0-8b10-18fa6407c08d	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	message	auto	1	0	327	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1264}	2026-06-01 06:27:25.295544+00
3b52f9ee-d5b6-435c-b4e8-f32007b5d78f	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	message	auto	1	0	266	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 985}	2026-06-01 06:28:24.653389+00
aad00469-64db-4b15-8aee-a7d4e21423f9	7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	message	auto	1	0	690	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2750}	2026-06-01 06:28:59.180813+00
54dc8c19-4dfe-48fe-bf41-7ed386300a7a	b01e9a49-58e3-4efe-88e5-72e93a37f622	message	auto	1	0	353	{"model_used": "gemini-2.5-flash", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1390}	2026-06-02 02:54:35.170156+00
84934823-ed1d-4181-8cf1-22126e3f2349	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	49	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 136}	2026-06-02 02:59:55.069927+00
c3b9a449-e417-484f-b6eb-bcbd9685674f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	950	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3747}	2026-06-02 03:24:30.813355+00
ff27d719-1f9c-404a-8c75-a622ad339a23	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	638	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2522}	2026-06-02 03:27:34.074658+00
6e734918-8dcd-4a71-8807-e90a1124c1eb	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	478	{"model_used": "gemini-2.5-flash", "study_mode": "osn_coach", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1859}	2026-06-02 03:30:38.421564+00
00b11fea-c75c-46f6-948f-10ee4ba85418	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	920	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "MAX_TOKENS", "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3619}	2026-06-02 04:23:30.074287+00
8261eb5d-c0ae-42f2-8577-960881526f0b	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	890	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3442}	2026-06-02 04:23:39.39161+00
7271835e-c976-46be-8014-70a3d65bcb98	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	935	{"model_used": "gpt-5-mini", "study_mode": "step_by_step", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3645}	2026-06-02 04:25:50.629395+00
7ab1cf7a-da39-4340-b0b3-f0facfe1b2e5	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	1015	{"model_used": "gpt-5-mini", "study_mode": "step_by_step", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3943}	2026-06-02 04:27:24.84979+00
2ccdf101-ea64-4845-994a-d7826dba1942	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	594	{"model_used": "gpt-5-mini", "study_mode": "step_by_step", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2260}	2026-06-02 04:27:46.567103+00
71d3efee-b8b8-4078-9130-bbb116833b79	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	1024	{"model_used": "gpt-5-mini", "study_mode": "step_by_step", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3980}	2026-06-02 04:34:04.565232+00
0774fa34-d98f-4d81-9f64-0c0cb803b06f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	225	{"model_used": "gpt-5-mini", "study_mode": "step_by_step", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 868}	2026-06-02 04:34:57.062674+00
5abec2b6-d4f9-467a-b9bb-2f75da33a00e	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	6	{"file_name": "BERAKHLAK kata kunci.pptx", "file_type": "pptx", "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "file_size_bytes": 3860245}	2026-06-02 06:29:33.340833+00
5b462e97-d33d-4de9-952e-14ba7994e576	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	0	{"file_name": "ChatGPT Image May 27, 2026, 06_14_40 PM.png", "file_type": "png", "mime_type": "image/png", "upload_kind": "image", "file_size_bytes": 1889053}	2026-06-02 06:30:58.50649+00
185b3568-fb89-4393-baf4-ec3ac093348f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	document	1	0	518	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": "gemini_pro_to_flash", "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2046}	2026-06-02 06:31:00.20974+00
66711eb6-c91b-44a5-9293-3825fefc61c5	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	875	{"file_name": "Shalat SUNNAH.pptx", "file_type": "pptx", "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "file_size_bytes": 9348038}	2026-06-02 06:31:51.342583+00
280b48ca-394e-48f0-8706-1d454fe937b2	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	369	{"file_name": "Mengenal Shalat Sunnah Rawatib.pptx", "file_type": "pptx", "mime_type": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "file_size_bytes": 8207069}	2026-06-02 13:40:39.892245+00
6f7cabd1-96e3-4ac8-929b-29b4500b5b2c	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	document	1	0	1400	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 1, "fallback_event": "gemini_pro_to_flash", "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [{"file_name": "Mengenal Shalat Sunnah Rawatib.pptx", "file_type": "powerpoint", "text_length": 1473}], "has_document_context": true, "has_knowledge_context": false, "streamed_reply_length": 2513}	2026-06-02 13:41:17.210732+00
e31e93e2-b968-4fd1-947f-1502ef55c1e5	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	156	{"file_name": "Muhammad Arham habiburrahman,1LSC,16,Seni budaya.pdf", "file_type": "pdf", "mime_type": "application/pdf", "file_size_bytes": 31680}	2026-06-02 13:42:08.375015+00
fca0d3f3-395e-4a5c-9402-2a214a174e7c	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	138	{"file_name": "BIOGRAFI SINGKAT Muhammad arham habiburrahman.docx", "file_type": "docx", "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "file_size_bytes": 16700}	2026-06-02 13:42:29.673503+00
dd06d93e-2431-4f56-9a11-d7cf7c3986f0	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	document	1	0	1152	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 2, "fallback_event": "gemini_pro_to_flash", "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [{"file_name": "Muhammad Arham habiburrahman,1LSC,16,Seni budaya.pdf", "file_type": "pdf", "text_length": 622}, {"file_name": "BIOGRAFI SINGKAT Muhammad arham habiburrahman.docx", "file_type": "word", "text_length": 551}], "has_document_context": true, "has_knowledge_context": false, "streamed_reply_length": 1938}	2026-06-02 13:42:56.490684+00
31e57bfe-431e-4d3e-ace1-416ce70dd9af	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	fast	1	0	710	{"model_used": "gemini-2.5-flash", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2695}	2026-06-03 03:28:56.513243+00
2ce8595f-3f84-4079-8702-4b8dec40c7a0	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	550	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2096}	2026-06-03 03:32:22.964556+00
36d41ed6-e687-4545-9816-8a4246d145ea	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	537	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2030}	2026-06-03 03:32:52.147049+00
a0839eb2-0762-4c77-ac2b-0ac9202b2aaf	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	fast	1	0	460	{"model_used": "gemini-2.5-flash", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1785}	2026-06-04 01:13:29.342462+00
b78ab246-f516-4c92-8f5c-c432cd2bc1bd	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	fast	1	0	664	{"model_used": "gemini-2.5-flash", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2639}	2026-06-04 01:14:52.187122+00
927dd8b5-fe94-4a91-af88-e15a6ed81f33	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	fast	1	0	486	{"model_used": "gemini-2.5-flash", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1900}	2026-06-04 01:16:10.922075+00
d9f34dfa-7bd0-40e8-90aa-3cfbdf4fa95f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	646	{"model_used": "gpt-5-mini", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2479}	2026-06-04 03:27:05.928843+00
963d1669-e818-4554-802f-29eba82a144e	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	919	{"model_used": "gpt-5-mini", "study_mode": "islamic_teacher", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3615}	2026-06-04 03:31:58.620007+00
a65a20c3-88d0-4f65-8231-8b62a7337f7f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	914	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 3554}	2026-06-06 03:07:00.126418+00
791918a6-e7fb-4cb6-ae41-b4f3c3f5c728	0401f446-d10e-412e-82a6-8ceddafe9bcb	message	auto	1	0	474	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1873}	2026-06-08 04:04:32.368273+00
ae08bd41-2af5-4043-94cd-cf306619e1e1	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	66	{"model_used": "gpt-5-mini", "study_mode": "coding_mentor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 242}	2026-06-08 06:57:15.743585+00
4a784e62-d0e6-4b28-8d9a-59a2750b3e45	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	389	{"model_used": "gpt-5-mini", "study_mode": "coding_mentor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1533}	2026-06-08 06:57:40.950364+00
c0ee15ac-0cbd-47e5-94fa-834afa3afdb9	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	612	{"model_used": "gpt-5-mini", "study_mode": "coding_mentor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2415}	2026-06-08 06:58:21.814939+00
8c8729a7-a0e8-4507-a17e-f71a8018a491	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	706	{"model_used": "gpt-5-mini", "study_mode": "coding_mentor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2777}	2026-06-08 06:59:17.293066+00
a485e761-7704-4fb3-a3bf-f11f3c24db9f	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	auto	1	0	57	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 198}	2026-06-09 00:45:51.224656+00
e5c40399-268f-4ca1-a226-08ab865e409f	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	auto	1	0	68	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 249}	2026-06-09 00:46:21.331726+00
e9781b40-08d5-49e4-9050-97a259c2fae5	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	fast	1	0	133	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 516}	2026-06-09 00:47:37.679497+00
44a2f296-5338-4925-8e1b-e7177b30c2f4	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	fast	1	0	80	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 310}	2026-06-09 00:47:50.919068+00
72eaca82-22e7-4f0b-aec0-ce2b860ff903	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	fast	1	0	27	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 96}	2026-06-09 00:48:11.00962+00
ec0e6c95-0649-49bd-94de-db9c3131c654	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	fast	1	0	24	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 80}	2026-06-09 00:48:24.17945+00
38dcc0be-129a-4305-96a2-941ef6e4a218	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	fast	1	0	147	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 542}	2026-06-09 00:48:49.046595+00
a8d1c804-ef3b-4c8c-b723-6b9920262961	854cc3b9-7718-47af-bfa5-6266829cb5b6	message	fast	1	0	118	{"model_used": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openrouter", "document_count": 0, "fallback_event": "gemini_to_openrouter", "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 392}	2026-06-09 00:50:39.780179+00
4c53c3c5-97ab-49f4-8e3d-01ceb7f4062a	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	204	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 785}	2026-06-11 02:38:43.107945+00
edbfa381-1eef-4f16-8b95-1c4c8bc37b43	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	281	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1090}	2026-06-11 02:40:57.18187+00
f37fca97-c96e-4933-9fab-63a7c427dc6f	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	204	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 781}	2026-06-11 02:41:32.311864+00
d533d167-f650-4e44-bea2-6239ada9d256	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	507	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1929}	2026-06-11 02:44:08.029007+00
261b167c-f33b-4db9-95d3-ba4fbcb7f8dd	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	514	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1938}	2026-06-11 02:45:20.452012+00
82056e51-5ae1-47ac-833f-b2a03a51b480	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	548	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2074}	2026-06-11 02:46:01.887606+00
c4510e51-0107-4722-9a66-e5bec6879a45	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	29	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 109}	2026-06-11 02:51:49.447574+00
23c1ab56-594d-463a-8238-51dbdb862aa6	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	265	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 976}	2026-06-11 02:53:04.387805+00
0a4f9f09-3b56-4aec-a918-cd3306832e58	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	108	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 356}	2026-06-11 02:54:56.319992+00
b1b7585f-e11b-47f1-880e-b3c56fcf5e3d	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	152	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": "max_output_tokens", "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 490}	2026-06-11 02:55:38.984677+00
6115f72d-e672-4bfa-8876-2511b380827e	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	45	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 144}	2026-06-20 04:09:12.154278+00
cc59ff22-b5d4-40f6-a1cb-5c798387a9dd	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	781	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2980}	2026-06-20 04:10:18.24787+00
6877aa6b-3e7c-494d-ac1e-51268863b608	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	112	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 439}	2026-06-20 04:11:39.81213+00
9f53e7e3-b837-4145-92b7-f200f208527d	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	smart	1	0	414	{"model_used": "gpt-5-mini", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "openai", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1629}	2026-06-20 04:12:20.482182+00
05fab67a-722b-4e13-916e-56b2bacd25b6	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	448	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 1755}	2026-07-01 11:11:31.783087+00
1046f0b3-bc60-448c-8da5-953de11134a1	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	681	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 2619}	2026-07-01 11:12:49.813466+00
9cc0604f-a215-4bb9-a09a-72dd0bc61743	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	0	{"file_name": "Screenshot 2026-05-28 191745.png", "file_type": "png", "mime_type": "image/png", "upload_kind": "image", "file_size_bytes": 81803}	2026-07-01 11:20:52.570305+00
7ac1953a-46ab-4c80-b950-c0980588ccab	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	355	{"file_name": "Muhammad arham habiburrahman 1LSCMM.xlsx", "file_type": "xlsx", "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "file_size_bytes": 16518}	2026-07-01 11:21:30.827552+00
43c34493-d1e1-4310-8d88-0a619ea5136b	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	1613	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 1, "finish_reason": "MAX_TOKENS", "provider_used": "gemini", "document_count": 1, "fallback_event": null, "has_user_memory": true, "uploaded_images": [{"file_name": "Screenshot 2026-05-28 191745.png", "mime_type": "image/png", "data_length": 109072}], "has_image_context": true, "knowledge_sources": [], "needs_continuation": true, "uploaded_documents": [{"file_name": "Muhammad arham habiburrahman 1LSCMM.xlsx", "file_type": "excel", "text_length": 1418}], "has_document_context": true, "has_knowledge_context": false, "streamed_reply_length": 3473}	2026-07-01 11:21:57.996446+00
6caa9fa4-27da-4fab-b91f-5569e2a8fbe2	e6eb571b-71a6-467c-9f69-f47f1e0664f1	document_upload	document	0	1	0	{"file_name": "ChatGPT Image Jul 1, 2026, 06_30_29 PM.png", "file_type": "png", "mime_type": "image/png", "upload_kind": "image", "file_size_bytes": 1343261}	2026-07-04 03:21:39.376792+00
ebb76e9f-6224-4567-bf70-5c3e89b5a925	e6eb571b-71a6-467c-9f69-f47f1e0664f1	message	auto	1	0	28	{"model_used": "gemini-2.5-flash", "study_mode": "cambridge_tutor", "image_count": 0, "finish_reason": null, "provider_used": "gemini", "document_count": 0, "fallback_event": null, "has_user_memory": true, "uploaded_images": [], "has_image_context": false, "knowledge_sources": [], "needs_continuation": false, "uploaded_documents": [], "has_document_context": false, "has_knowledge_context": false, "streamed_reply_length": 102}	2026-07-04 03:22:06.523704+00
\.


--
-- Data for Name: user_memory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_memory (user_id, display_name, school_level, learning_goals, favorite_subjects, preferred_language, preferred_explanation_style, created_at, updated_at, theme_preference, default_model, default_study_mode) FROM stdin;
e6eb571b-71a6-467c-9f69-f47f1e0664f1	Arham	kelas 7 smp	Goal: AI, OSN Matematika, Fisika, Coding Style: step-by-step seperti guru Cambridge	{Matematika,fisika,"dan coding"}	Bahasa Indonesia sederhana	Singkat, langsung ke inti, lalu contoh.	2026-05-31 01:08:39.542806+00	2026-06-01 00:23:11.218874+00	system	auto	cambridge_tutor
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (user_id, display_name, daily_message_count, daily_upload_count, daily_reset_date, created_at, updated_at) FROM stdin;
fa930b99-a432-407c-b2bc-d12e0df7033f	\N	0	0	2026-05-30	2026-05-30 14:06:13.196605+00	2026-05-30 14:06:13.196605+00
7aa4bce8-dae9-4b3a-9c26-eca4e0551bc5	\N	0	0	2026-06-14	2026-06-01 06:25:10.689897+00	2026-06-14 06:02:03.979067+00
e6eb571b-71a6-467c-9f69-f47f1e0664f1	\N	1	1	2026-07-04	2026-05-30 13:55:44.214153+00	2026-07-04 03:22:06.523704+00
0401f446-d10e-412e-82a6-8ceddafe9bcb	\N	1	0	2026-06-08	2026-06-08 04:01:40.742659+00	2026-06-08 04:04:32.368273+00
b01e9a49-58e3-4efe-88e5-72e93a37f622	\N	1	0	2026-06-02	2026-06-02 02:52:48.356768+00	2026-06-02 02:54:35.170156+00
854cc3b9-7718-47af-bfa5-6266829cb5b6	\N	8	0	2026-06-09	2026-06-08 13:49:24.762102+00	2026-06-09 00:50:39.780179+00
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2026-05-29 10:55:51
20211116045059	2026-05-29 10:55:51
20211116050929	2026-05-29 10:55:51
20211116051442	2026-05-29 10:55:51
20211116212300	2026-05-29 10:55:51
20211116213355	2026-05-29 10:55:51
20211116213934	2026-05-29 10:55:51
20211116214523	2026-05-29 10:55:51
20211122062447	2026-05-29 10:55:51
20211124070109	2026-05-29 10:55:51
20211202204204	2026-05-29 10:55:51
20211202204605	2026-05-29 10:55:51
20211210212804	2026-05-29 10:55:51
20211228014915	2026-05-29 10:55:52
20220107221237	2026-05-29 10:55:52
20220228202821	2026-05-29 10:55:52
20220312004840	2026-05-29 10:55:52
20220603231003	2026-05-29 10:55:52
20220603232444	2026-05-29 10:55:52
20220615214548	2026-05-29 10:55:52
20220712093339	2026-05-29 10:55:52
20220908172859	2026-05-29 10:55:52
20220916233421	2026-05-29 10:55:52
20230119133233	2026-05-29 10:55:52
20230128025114	2026-05-29 10:55:52
20230128025212	2026-05-29 10:55:52
20230227211149	2026-05-29 10:55:52
20230228184745	2026-05-29 10:55:52
20230308225145	2026-05-29 10:55:53
20230328144023	2026-05-29 10:55:53
20231018144023	2026-05-29 10:55:53
20231204144023	2026-05-29 10:55:53
20231204144024	2026-05-29 10:55:53
20231204144025	2026-05-29 10:55:53
20240108234812	2026-05-29 10:55:53
20240109165339	2026-05-29 10:55:53
20240227174441	2026-05-29 10:55:53
20240311171622	2026-05-29 10:55:53
20240321100241	2026-05-29 10:55:53
20240401105812	2026-05-29 12:53:22
20240418121054	2026-05-29 12:53:22
20240523004032	2026-05-29 12:53:22
20240618124746	2026-05-29 12:53:22
20240801235015	2026-05-29 12:53:22
20240805133720	2026-05-29 12:53:22
20240827160934	2026-05-29 12:53:22
20240919163303	2026-05-29 12:53:22
20240919163305	2026-05-29 12:53:22
20241019105805	2026-05-29 12:53:22
20241030150047	2026-05-29 12:53:22
20241108114728	2026-05-29 12:53:22
20241121104152	2026-05-29 12:53:22
20241130184212	2026-05-29 12:53:22
20241220035512	2026-05-29 12:53:22
20241220123912	2026-05-29 12:53:22
20241224161212	2026-05-29 12:53:22
20250107150512	2026-05-29 12:53:23
20250110162412	2026-05-29 12:53:23
20250123174212	2026-05-29 12:53:23
20250128220012	2026-05-29 12:53:23
20250506224012	2026-05-29 12:53:23
20250523164012	2026-05-29 12:53:23
20250714121412	2026-05-29 12:53:23
20250905041441	2026-05-29 12:53:23
20251103001201	2026-05-29 12:53:23
20251120212548	2026-05-29 12:53:23
20251120215549	2026-05-29 12:53:23
20260218120000	2026-05-29 12:53:23
20260326120000	2026-05-29 12:53:23
20260514120000	2026-06-08 04:06:27
20260527120000	2026-06-08 04:06:27
20260528120000	2026-06-08 04:06:27
20260603120000	2026-06-08 04:06:27
20260605120000	2026-07-01 11:10:20
20260606110000	2026-07-01 11:10:20
20260616120000	2026-07-01 11:10:20
20260624120000	2026-07-01 11:10:20
20260626120000	2026-07-04 03:05:33
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: supabase_admin
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at, action_filter, selected_columns) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id, type) FROM stdin;
documents	documents	\N	2026-05-29 12:56:45.251836+00	2026-05-29 12:56:45.251836+00	f	f	\N	\N	\N	STANDARD
\.


--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_analytics (name, type, format, created_at, updated_at, id, deleted_at) FROM stdin;
\.


--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.buckets_vectors (id, type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2026-05-29 10:55:52.547298
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2026-05-29 10:55:52.683005
2	storage-schema	f6a1fa2c93cbcd16d4e487b362e45fca157a8dbd	2026-05-29 10:55:52.687455
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2026-05-29 10:55:52.713495
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2026-05-29 10:55:52.757919
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2026-05-29 10:55:52.762821
6	change-column-name-in-get-size	ded78e2f1b5d7e616117897e6443a925965b30d2	2026-05-29 10:55:52.767698
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2026-05-29 10:55:52.815214
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2026-05-29 10:55:52.819617
9	fix-search-function	af597a1b590c70519b464a4ab3be54490712796b	2026-05-29 10:55:52.824946
10	search-files-search-function	b595f05e92f7e91211af1bbfe9c6a13bb3391e16	2026-05-29 10:55:52.830301
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2026-05-29 10:55:52.835059
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2026-05-29 10:55:52.840216
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2026-05-29 10:55:52.844608
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2026-05-29 10:55:52.849075
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2026-05-29 10:55:52.927161
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2026-05-29 10:55:52.931445
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2026-05-29 10:55:52.936093
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2026-05-29 10:55:52.940501
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2026-05-29 10:55:52.945491
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2026-05-29 10:55:52.951576
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2026-05-29 10:55:52.959189
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2026-05-29 10:55:52.973932
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2026-05-29 10:55:52.984939
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2026-05-29 10:55:52.989837
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2026-05-29 10:55:52.994088
26	objects-prefixes	215cabcb7f78121892a5a2037a09fedf9a1ae322	2026-05-29 10:55:52.999146
27	search-v2	859ba38092ac96eb3964d83bf53ccc0b141663a6	2026-05-29 10:55:53.003151
28	object-bucket-name-sorting	c73a2b5b5d4041e39705814fd3a1b95502d38ce4	2026-05-29 10:55:53.007132
29	create-prefixes	ad2c1207f76703d11a9f9007f821620017a66c21	2026-05-29 10:55:53.011824
30	update-object-levels	2be814ff05c8252fdfdc7cfb4b7f5c7e17f0bed6	2026-05-29 10:55:53.016738
31	objects-level-index	b40367c14c3440ec75f19bbce2d71e914ddd3da0	2026-05-29 10:55:53.020729
32	backward-compatible-index-on-objects	e0c37182b0f7aee3efd823298fb3c76f1042c0f7	2026-05-29 10:55:53.024642
33	backward-compatible-index-on-prefixes	b480e99ed951e0900f033ec4eb34b5bdcb4e3d49	2026-05-29 10:55:53.028716
34	optimize-search-function-v1	ca80a3dc7bfef894df17108785ce29a7fc8ee456	2026-05-29 10:55:53.033036
35	add-insert-trigger-prefixes	458fe0ffd07ec53f5e3ce9df51bfdf4861929ccc	2026-05-29 10:55:53.037085
36	optimise-existing-functions	6ae5fca6af5c55abe95369cd4f93985d1814ca8f	2026-05-29 10:55:53.041404
37	add-bucket-name-length-trigger	3944135b4e3e8b22d6d4cbb568fe3b0b51df15c1	2026-05-29 10:55:53.045593
38	iceberg-catalog-flag-on-buckets	02716b81ceec9705aed84aa1501657095b32e5c5	2026-05-29 10:55:53.050499
39	add-search-v2-sort-support	6706c5f2928846abee18461279799ad12b279b78	2026-05-29 10:55:53.058296
40	fix-prefix-race-conditions-optimized	7ad69982ae2d372b21f48fc4829ae9752c518f6b	2026-05-29 10:55:53.062752
41	add-object-level-update-trigger	07fcf1a22165849b7a029deed059ffcde08d1ae0	2026-05-29 10:55:53.066724
42	rollback-prefix-triggers	771479077764adc09e2ea2043eb627503c034cd4	2026-05-29 10:55:53.070718
43	fix-object-level	84b35d6caca9d937478ad8a797491f38b8c2979f	2026-05-29 10:55:53.074707
44	vector-bucket-type	99c20c0ffd52bb1ff1f32fb992f3b351e3ef8fb3	2026-05-29 10:55:53.078779
45	vector-buckets	049e27196d77a7cb76497a85afae669d8b230953	2026-05-29 10:55:53.083425
46	buckets-objects-grants	fedeb96d60fefd8e02ab3ded9fbde05632f84aed	2026-05-29 10:55:53.095229
47	iceberg-table-metadata	649df56855c24d8b36dd4cc1aeb8251aa9ad42c2	2026-05-29 10:55:53.100197
48	iceberg-catalog-ids	e0e8b460c609b9999ccd0df9ad14294613eed939	2026-05-29 10:55:53.104464
49	buckets-objects-grants-postgres	072b1195d0d5a2f888af6b2302a1938dd94b8b3d	2026-05-29 10:55:53.16291
50	search-v2-optimised	6323ac4f850aa14e7387eb32102869578b5bd478	2026-05-29 10:55:53.182083
51	index-backward-compatible-search	2ee395d433f76e38bcd3856debaf6e0e5b674011	2026-05-29 10:56:05.77172
52	drop-not-used-indexes-and-functions	5cc44c8696749ac11dd0dc37f2a3802075f3a171	2026-05-29 10:56:05.77693
53	drop-index-lower-name	d0cb18777d9e2a98ebe0bc5cc7a42e57ebe41854	2026-05-29 10:56:05.792239
54	drop-index-object-level	6289e048b1472da17c31a7eba1ded625a6457e67	2026-05-29 10:56:05.795771
55	prevent-direct-deletes	262a4798d5e0f2e7c8970232e03ce8be695d5819	2026-05-29 10:56:05.797907
56	fix-optimized-search-function	b823ed1e418101032fa01374edc9a436e54e3ed4	2026-05-29 10:56:05.821764
57	s3-multipart-uploads-metadata	f127886e00d1b374fadbc7c6b31e09336aad5287	2026-05-29 10:56:05.835286
58	operation-ergonomics	00ca5d483b3fe0d522133d9002ccc5df98365120	2026-05-29 10:56:05.841922
59	drop-unused-functions	38456f13e39691c2bbb4b5151d0d1cdbabd4a8c4	2026-05-29 10:56:05.851672
60	optimize-existing-functions-again	db35e1c91a9201e59f4fef8d972c2f277d68b157	2026-05-29 10:56:05.857677
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
eb1fa89e-7e51-41f4-bc7e-6d9b9127f098	documents	1780144233371-888278b2-63d9-40db-8d84-002ea20eed44-mathematic-task-graph-2-by-muhammad-arham-habiburrahman.docx	\N	2026-05-30 12:30:35.678529+00	2026-05-30 12:30:35.678529+00	2026-05-30 12:30:35.678529+00	{"eTag": "\\"52850a5a47f397d9fbf7655fa2844f24\\"", "size": 664253, "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "cacheControl": "max-age=3600", "lastModified": "2026-05-30T12:30:36.000Z", "contentLength": 664253, "httpStatusCode": 200}	5235f42b-14e9-4d34-b44a-21ee47ceea8b	\N	{}
4fa87e58-4a35-47b1-80a3-40c948fd1f64	documents	1780147018456-d1d59553-7578-44d0-8537-9c11562373d3-ef-set-certificate.pdf	\N	2026-05-30 13:17:01.196212+00	2026-05-30 13:17:01.196212+00	2026-05-30 13:17:01.196212+00	{"eTag": "\\"ef60c3b2cc0748c8c24d5435c2113080\\"", "size": 82960, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-30T13:17:02.000Z", "contentLength": 82960, "httpStatusCode": 200}	64d03790-7998-4165-9b39-c3cbee22a9ea	\N	{}
a77c734c-0b71-4f38-b385-c3acdc9bb910	documents	1780238357841-ecdba076-1cd9-4e94-bcf3-9c0261b256da-science-task-about-lungs.pdf	\N	2026-05-31 14:39:20.442506+00	2026-05-31 14:39:20.442506+00	2026-05-31 14:39:20.442506+00	{"eTag": "\\"f00fdaa67fc443f0e307335d1212e44a\\"", "size": 1127159, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-05-31T14:39:21.000Z", "contentLength": 1127159, "httpStatusCode": 200}	5f6bf26e-f6e7-4cd3-90d6-2d85df8aaa47	\N	{}
4a2c8aa9-9948-42b2-a1e4-7db0772df89e	documents	1780280444445-ec64b654-e135-4673-a9cd-d7c56dde12ff-roadmap_osn_matematika_smp_2027.pdf	\N	2026-06-01 02:20:44.916721+00	2026-06-01 02:20:44.916721+00	2026-06-01 02:20:44.916721+00	{"eTag": "\\"4b4b61046a30ebfb8de821d7d6cf7b1e\\"", "size": 4044, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-06-01T02:20:45.000Z", "contentLength": 4044, "httpStatusCode": 200}	848da86d-2429-4b99-a27c-72fa9028c0ba	\N	{}
f0d8bfe3-fc22-43a9-a3d0-597b7d76c022	documents	1780280462256-0272638a-18f5-4f1e-9fe9-142f858b076f-kemuhammadiyahan_dasar.pdf	\N	2026-06-01 02:21:02.506054+00	2026-06-01 02:21:02.506054+00	2026-06-01 02:21:02.506054+00	{"eTag": "\\"f5d2daff0f8ba99f11ee8b579b3a1586\\"", "size": 3783, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-06-01T02:21:03.000Z", "contentLength": 3783, "httpStatusCode": 200}	4eb06c78-f144-4d6c-8754-31abff160fdd	\N	{}
8bee773d-3532-4993-9f6f-9c85ff677089	documents	1780280511409-37f1b01b-7a5c-48a8-81ac-c29b0ab9b4a9-chatgpt-image-may-27-2026-06_14_40-pm.png	\N	2026-06-01 02:21:53.238349+00	2026-06-01 02:21:53.238349+00	2026-06-01 02:21:53.238349+00	{"eTag": "\\"73709c209c9618adf6e413450df2e030\\"", "size": 1889053, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-06-01T02:21:54.000Z", "contentLength": 1889053, "httpStatusCode": 200}	58abfab4-6de3-4eb1-b7f5-cb65d8f4e235	\N	{}
7c57a949-8a3f-487b-95a7-3b7babe49f08	documents	1780381721395-95732145-f02d-4586-86b4-6facb96aa158-berakhlak-kata-kunci.pptx	\N	2026-06-02 06:29:33.023697+00	2026-06-02 06:29:33.023697+00	2026-06-02 06:29:33.023697+00	{"eTag": "\\"f4406dbab65f9281fe40b9cee30cafcd\\"", "size": 3860245, "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "cacheControl": "max-age=3600", "lastModified": "2026-06-02T06:29:33.000Z", "contentLength": 3860245, "httpStatusCode": 200}	58a09612-c9c4-4ea7-a3a3-1bf370ac6b7a	\N	{}
628b0957-3179-48b7-a1a5-dddc9da43a5f	documents	1780381831638-e8d58669-7d22-4b6d-aa4c-aea29ef6492f-chatgpt-image-may-27-2026-06_14_40-pm.png	\N	2026-06-02 06:30:58.288514+00	2026-06-02 06:30:58.288514+00	2026-06-02 06:30:58.288514+00	{"eTag": "\\"73709c209c9618adf6e413450df2e030\\"", "size": 1889053, "mimetype": "image/png", "cacheControl": "max-age=3600", "lastModified": "2026-06-02T06:30:59.000Z", "contentLength": 1889053, "httpStatusCode": 200}	7bda4145-4674-4c57-beb9-2b7ddb735350	\N	{}
a47ad265-dde3-4dc0-8e8a-475f9b23e63b	documents	1780381789906-1aa24d5e-37f1-4d8b-bf49-5ebcf03b309a-shalat-sunnah.pptx	\N	2026-06-02 06:31:50.96245+00	2026-06-02 06:31:50.96245+00	2026-06-02 06:31:50.96245+00	{"eTag": "\\"6ac1e909c4f655d19001d0f2de2be4be-2\\"", "size": 9348038, "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "cacheControl": "max-age=3600", "lastModified": "2026-06-02T06:31:51.000Z", "contentLength": 9348038, "httpStatusCode": 200}	e9d26325-ecec-4e1f-b1f2-b663a3729c5c	\N	{}
2119d929-fc8a-4e21-913a-1fa4643be9ce	documents	1780407631321-343b6b23-6265-4392-9638-70c15f5803f0-mengenal-shalat-sunnah-rawatib.pptx	\N	2026-06-02 13:40:39.614363+00	2026-06-02 13:40:39.614363+00	2026-06-02 13:40:39.614363+00	{"eTag": "\\"4490a3c52f54c8327f9d1383f63f2edb-2\\"", "size": 8207069, "mimetype": "application/vnd.openxmlformats-officedocument.presentationml.presentation", "cacheControl": "max-age=3600", "lastModified": "2026-06-02T13:40:40.000Z", "contentLength": 8207069, "httpStatusCode": 200}	bf41aa9d-6643-4043-abc8-2fe91d4e6e48	\N	{}
0d66f7db-df28-4408-afd8-110c9eb63f05	documents	1780407727579-65f96a89-09af-4bc5-88eb-a53fa2030e0b-muhammad-arham-habiburrahman1lsc16seni-budaya.pdf	\N	2026-06-02 13:42:08.160948+00	2026-06-02 13:42:08.160948+00	2026-06-02 13:42:08.160948+00	{"eTag": "\\"5cbdf8e394eb52824f4ef5e835315fdf\\"", "size": 31680, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2026-06-02T13:42:09.000Z", "contentLength": 31680, "httpStatusCode": 200}	9655afad-d62e-40ea-8b90-dc30e15b4973	\N	{}
a36effe1-6037-44eb-aa39-b09fcd1ef940	documents	1780407748782-cf7828b2-bef9-42ec-abc2-556023124b66-biografi-singkat-muhammad-arham-habiburrahman.docx	\N	2026-06-02 13:42:29.432475+00	2026-06-02 13:42:29.432475+00	2026-06-02 13:42:29.432475+00	{"eTag": "\\"b00565b16335ebb27050d4c7de266337\\"", "size": 16700, "mimetype": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "cacheControl": "max-age=3600", "lastModified": "2026-06-02T13:42:30.000Z", "contentLength": 16700, "httpStatusCode": 200}	9cc5a6c2-7162-478e-8df9-c59005c8ae8a	\N	{}
5102be24-24e8-4293-96f5-48a9a82cb57e	documents	1782904889814-d10c159e-1132-4ae8-b545-d51a32550999-muhammad-arham-habiburrahman-1lscmm.xlsx	\N	2026-07-01 11:21:30.368561+00	2026-07-01 11:21:30.368561+00	2026-07-01 11:21:30.368561+00	{"eTag": "\\"a2e1b9ef568b281cf3d4d60ed9000452\\"", "size": 16518, "mimetype": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "cacheControl": "max-age=3600", "lastModified": "2026-07-01T11:21:31.000Z", "contentLength": 16518, "httpStatusCode": 200}	a607bb81-4555-4b81-9454-96f68564ed38	\N	{}
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata, metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

COPY storage.vector_indexes (id, name, bucket_id, data_type, dimension, distance_metric, metadata_configuration, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: supabase_admin
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 41, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: supabase_admin
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: custom_oauth_providers custom_oauth_providers_identifier_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_identifier_key UNIQUE (identifier);


--
-- Name: custom_oauth_providers custom_oauth_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.custom_oauth_providers
    ADD CONSTRAINT custom_oauth_providers_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_code_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_code_key UNIQUE (authorization_code);


--
-- Name: oauth_authorizations oauth_authorizations_authorization_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_authorization_id_key UNIQUE (authorization_id);


--
-- Name: oauth_authorizations oauth_authorizations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_pkey PRIMARY KEY (id);


--
-- Name: oauth_client_states oauth_client_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_client_states
    ADD CONSTRAINT oauth_client_states_pkey PRIMARY KEY (id);


--
-- Name: oauth_clients oauth_clients_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_clients
    ADD CONSTRAINT oauth_clients_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_pkey PRIMARY KEY (id);


--
-- Name: oauth_consents oauth_consents_user_client_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_client_unique UNIQUE (user_id, client_id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webauthn_credentials webauthn_credentials_pkey; Type: CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_pkey PRIMARY KEY (id);


--
-- Name: chat_workspaces chat_workspaces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_workspaces
    ADD CONSTRAINT chat_workspaces_pkey PRIMARY KEY (id);


--
-- Name: chat_workspaces chat_workspaces_user_name_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_workspaces
    ADD CONSTRAINT chat_workspaces_user_name_unique UNIQUE (user_id, name);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_pkey PRIMARY KEY (id);


--
-- Name: knowledge_chunks knowledge_chunks_source_id_chunk_order_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_source_id_chunk_order_key UNIQUE (source_id, chunk_order);


--
-- Name: knowledge_sources knowledge_sources_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_sources
    ADD CONSTRAINT knowledge_sources_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: usage_logs usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_pkey PRIMARY KEY (id);


--
-- Name: user_memory user_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_memory
    ADD CONSTRAINT user_memory_pkey PRIMARY KEY (user_id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: messages messages_payload_exclusive; Type: CHECK CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages
    ADD CONSTRAINT messages_payload_exclusive CHECK (((payload IS NULL) OR (binary_payload IS NULL))) NOT VALID;


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: supabase_admin
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets_analytics buckets_analytics_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_analytics
    ADD CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: buckets_vectors buckets_vectors_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.buckets_vectors
    ADD CONSTRAINT buckets_vectors_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: vector_indexes vector_indexes_pkey; Type: CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: custom_oauth_providers_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_created_at_idx ON auth.custom_oauth_providers USING btree (created_at);


--
-- Name: custom_oauth_providers_enabled_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_enabled_idx ON auth.custom_oauth_providers USING btree (enabled);


--
-- Name: custom_oauth_providers_identifier_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_identifier_idx ON auth.custom_oauth_providers USING btree (identifier);


--
-- Name: custom_oauth_providers_provider_type_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX custom_oauth_providers_provider_type_idx ON auth.custom_oauth_providers USING btree (provider_type);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_oauth_client_states_created_at; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_oauth_client_states_created_at ON auth.oauth_client_states USING btree (created_at);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: idx_users_created_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_created_at_desc ON auth.users USING btree (created_at DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_email ON auth.users USING btree (email);


--
-- Name: idx_users_last_sign_in_at_desc; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_last_sign_in_at_desc ON auth.users USING btree (last_sign_in_at DESC);


--
-- Name: idx_users_name; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX idx_users_name ON auth.users USING btree (((raw_user_meta_data ->> 'name'::text))) WHERE ((raw_user_meta_data ->> 'name'::text) IS NOT NULL);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: oauth_auth_pending_exp_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_auth_pending_exp_idx ON auth.oauth_authorizations USING btree (expires_at) WHERE (status = 'pending'::auth.oauth_authorization_status);


--
-- Name: oauth_clients_deleted_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_clients_deleted_at_idx ON auth.oauth_clients USING btree (deleted_at);


--
-- Name: oauth_consents_active_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_client_idx ON auth.oauth_consents USING btree (client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_active_user_client_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_active_user_client_idx ON auth.oauth_consents USING btree (user_id, client_id) WHERE (revoked_at IS NULL);


--
-- Name: oauth_consents_user_order_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX oauth_consents_user_order_idx ON auth.oauth_consents USING btree (user_id, granted_at DESC);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_oauth_client_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_oauth_client_id_idx ON auth.sessions USING btree (oauth_client_id);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: sso_providers_resource_id_pattern_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX sso_providers_resource_id_pattern_idx ON auth.sso_providers USING btree (resource_id text_pattern_ops);


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: supabase_auth_admin
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: webauthn_challenges_expires_at_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_expires_at_idx ON auth.webauthn_challenges USING btree (expires_at);


--
-- Name: webauthn_challenges_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_challenges_user_id_idx ON auth.webauthn_challenges USING btree (user_id);


--
-- Name: webauthn_credentials_credential_id_key; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE UNIQUE INDEX webauthn_credentials_credential_id_key ON auth.webauthn_credentials USING btree (credential_id);


--
-- Name: webauthn_credentials_user_id_idx; Type: INDEX; Schema: auth; Owner: supabase_auth_admin
--

CREATE INDEX webauthn_credentials_user_id_idx ON auth.webauthn_credentials USING btree (user_id);


--
-- Name: chat_workspaces_user_name_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX chat_workspaces_user_name_idx ON public.chat_workspaces USING btree (user_id, name);


--
-- Name: conversations_title_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_title_trgm_idx ON public.conversations USING gin (title public.gin_trgm_ops);


--
-- Name: conversations_updated_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_updated_at_idx ON public.conversations USING btree (updated_at DESC);


--
-- Name: conversations_user_pinned_updated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_user_pinned_updated_idx ON public.conversations USING btree (user_id, is_pinned DESC, updated_at DESC);


--
-- Name: conversations_user_updated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_user_updated_idx ON public.conversations USING btree (user_id, updated_at DESC);


--
-- Name: conversations_workspace_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_workspace_idx ON public.conversations USING btree (workspace_id);


--
-- Name: conversations_workspace_updated_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX conversations_workspace_updated_idx ON public.conversations USING btree (workspace_id, updated_at DESC);


--
-- Name: knowledge_chunks_search_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_chunks_search_idx ON public.knowledge_chunks USING gin (search_vector);


--
-- Name: knowledge_chunks_source_order_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_chunks_source_order_idx ON public.knowledge_chunks USING btree (source_id, chunk_order);


--
-- Name: knowledge_sources_status_public_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_sources_status_public_idx ON public.knowledge_sources USING btree (status, is_public, created_at DESC);


--
-- Name: messages_content_trgm_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_content_trgm_idx ON public.messages USING gin (content public.gin_trgm_ops);


--
-- Name: messages_conversation_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_conversation_created_idx ON public.messages USING btree (conversation_id, created_at);


--
-- Name: messages_conversation_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX messages_conversation_id_idx ON public.messages USING btree (conversation_id);


--
-- Name: subscriptions_user_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX subscriptions_user_status_idx ON public.subscriptions USING btree (user_id, status, current_period_end DESC);


--
-- Name: usage_logs_user_action_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX usage_logs_user_action_created_idx ON public.usage_logs USING btree (user_id, action, created_at DESC);


--
-- Name: usage_logs_user_created_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX usage_logs_user_created_idx ON public.usage_logs USING btree (user_id, created_at DESC);


--
-- Name: user_memory_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX user_memory_user_id_idx ON public.user_memory USING btree (user_id);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: messages_inserted_at_topic_index; Type: INDEX; Schema: realtime; Owner: supabase_realtime_admin
--

CREATE INDEX messages_inserted_at_topic_index ON ONLY realtime.messages USING btree (inserted_at DESC, topic) WHERE ((extension = 'broadcast'::text) AND (private IS TRUE));


--
-- Name: subscription_subscription_id_entity_filters_action_filter_selec; Type: INDEX; Schema: realtime; Owner: supabase_admin
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_action_filter_selec ON realtime.subscription USING btree (subscription_id, entity, filters, action_filter, COALESCE(selected_columns, '{}'::text[]));


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: buckets_analytics_unique_name_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: vector_indexes_name_bucket_id_idx; Type: INDEX; Schema: storage; Owner: supabase_storage_admin
--

CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);


--
-- Name: users auth_users_create_profile; Type: TRIGGER; Schema: auth; Owner: supabase_auth_admin
--

CREATE TRIGGER auth_users_create_profile AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


--
-- Name: chat_workspaces chat_workspaces_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER chat_workspaces_set_updated_at BEFORE UPDATE ON public.chat_workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: conversations conversations_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER conversations_set_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: conversations conversations_workspace_owner; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER conversations_workspace_owner BEFORE INSERT OR UPDATE OF workspace_id, user_id ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.ensure_conversation_workspace_owner();


--
-- Name: knowledge_sources knowledge_sources_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER knowledge_sources_set_updated_at BEFORE UPDATE ON public.knowledge_sources FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: messages messages_touch_conversation; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER messages_touch_conversation AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_after_message();


--
-- Name: subscriptions subscriptions_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_memory user_memory_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_memory_set_updated_at BEFORE UPDATE ON public.user_memory FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_profiles user_profiles_set_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER user_profiles_set_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: supabase_admin
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: buckets enforce_bucket_name_length_trigger; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();


--
-- Name: buckets protect_buckets_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects protect_objects_delete; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: supabase_storage_admin
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_authorizations oauth_authorizations_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_authorizations
    ADD CONSTRAINT oauth_authorizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_client_id_fkey FOREIGN KEY (client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: oauth_consents oauth_consents_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.oauth_consents
    ADD CONSTRAINT oauth_consents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_oauth_client_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_oauth_client_id_fkey FOREIGN KEY (oauth_client_id) REFERENCES auth.oauth_clients(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: webauthn_challenges webauthn_challenges_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webauthn_credentials webauthn_credentials_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE ONLY auth.webauthn_credentials
    ADD CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_workspaces chat_workspaces_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_workspaces
    ADD CONSTRAINT chat_workspaces_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.chat_workspaces(id) ON DELETE SET NULL;


--
-- Name: knowledge_chunks knowledge_chunks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: knowledge_chunks knowledge_chunks_source_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_chunks
    ADD CONSTRAINT knowledge_chunks_source_id_fkey FOREIGN KEY (source_id) REFERENCES public.knowledge_sources(id) ON DELETE CASCADE;


--
-- Name: knowledge_sources knowledge_sources_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_sources
    ADD CONSTRAINT knowledge_sources_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: usage_logs usage_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_logs
    ADD CONSTRAINT usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_memory user_memory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_memory
    ADD CONSTRAINT user_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: vector_indexes vector_indexes_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE ONLY storage.vector_indexes
    ADD CONSTRAINT vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: supabase_auth_admin
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_chunks Authenticated users can read active public knowledge chunks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read active public knowledge chunks" ON public.knowledge_chunks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.knowledge_sources sources
  WHERE ((sources.id = knowledge_chunks.source_id) AND (sources.status = 'active'::text) AND (sources.is_public = true)))));


--
-- Name: knowledge_sources Authenticated users can read active public knowledge sources; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Authenticated users can read active public knowledge sources" ON public.knowledge_sources FOR SELECT TO authenticated USING (((status = 'active'::text) AND (is_public = true)));


--
-- Name: knowledge_chunks Knowledge admins can manage knowledge chunks; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Knowledge admins can manage knowledge chunks" ON public.knowledge_chunks TO authenticated USING ((COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text), false) OR COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'knowledge_admin'::text))::boolean, false))) WITH CHECK ((COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text), false) OR COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'knowledge_admin'::text))::boolean, false)));


--
-- Name: knowledge_sources Knowledge admins can manage knowledge sources; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Knowledge admins can manage knowledge sources" ON public.knowledge_sources TO authenticated USING ((COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text), false) OR COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'knowledge_admin'::text))::boolean, false))) WITH CHECK ((COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text), false) OR COALESCE((((auth.jwt() -> 'app_metadata'::text) ->> 'knowledge_admin'::text))::boolean, false)));


--
-- Name: messages Users can create messages in own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create messages in own conversations" ON public.messages FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: chat_workspaces Users can create own chat workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own chat workspaces" ON public.chat_workspaces FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can create own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_memory Users can create own memory; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can create own memory" ON public.user_memory FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: messages Users can delete messages in own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete messages in own conversations" ON public.messages FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: chat_workspaces Users can delete own chat workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own chat workspaces" ON public.chat_workspaces FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: conversations Users can delete own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: messages Users can read messages in own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read messages in own conversations" ON public.messages FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: chat_workspaces Users can read own chat workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own chat workspaces" ON public.chat_workspaces FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversations Users can read own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own conversations" ON public.conversations FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_memory Users can read own memory; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own memory" ON public.user_memory FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_profiles Users can read own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own profile" ON public.user_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: subscriptions Users can read own subscriptions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own subscriptions" ON public.subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: usage_logs Users can read own usage logs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can read own usage logs" ON public.usage_logs FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: messages Users can update messages in own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update messages in own conversations" ON public.messages FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversations
  WHERE ((conversations.id = messages.conversation_id) AND (conversations.user_id = auth.uid())))));


--
-- Name: chat_workspaces Users can update own chat workspaces; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own chat workspaces" ON public.chat_workspaces FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversations Users can update own conversations; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_memory Users can update own memory; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own memory" ON public.user_memory FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_profiles Users can update own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_workspaces; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.chat_workspaces ENABLE ROW LEVEL SECURITY;

--
-- Name: conversations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_chunks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_sources; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: user_memory; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: supabase_realtime_admin
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_analytics; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets_vectors; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: vector_indexes; Type: ROW SECURITY; Schema: storage; Owner: supabase_storage_admin
--

ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: postgres
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


ALTER PUBLICATION supabase_realtime OWNER TO postgres;

--
-- Name: SCHEMA auth; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA auth TO anon;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT USAGE ON SCHEMA auth TO service_role;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON SCHEMA auth TO dashboard_user;
GRANT USAGE ON SCHEMA auth TO postgres;


--
-- Name: SCHEMA extensions; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA extensions TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA extensions TO service_role;
GRANT ALL ON SCHEMA extensions TO dashboard_user;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;


--
-- Name: SCHEMA realtime; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA realtime TO postgres;
GRANT USAGE ON SCHEMA realtime TO anon;
GRANT USAGE ON SCHEMA realtime TO authenticated;
GRANT USAGE ON SCHEMA realtime TO service_role;
GRANT ALL ON SCHEMA realtime TO supabase_realtime_admin;


--
-- Name: SCHEMA storage; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA storage TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA storage TO anon;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT USAGE ON SCHEMA storage TO service_role;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON SCHEMA storage TO dashboard_user;


--
-- Name: SCHEMA vault; Type: ACL; Schema: -; Owner: supabase_admin
--

GRANT USAGE ON SCHEMA vault TO postgres WITH GRANT OPTION;
GRANT USAGE ON SCHEMA vault TO service_role;


--
-- Name: FUNCTION gtrgm_in(cstring); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_in(cstring) TO service_role;


--
-- Name: FUNCTION gtrgm_out(public.gtrgm); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_out(public.gtrgm) TO service_role;


--
-- Name: FUNCTION email(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.email() TO dashboard_user;


--
-- Name: FUNCTION jwt(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.jwt() TO postgres;
GRANT ALL ON FUNCTION auth.jwt() TO dashboard_user;


--
-- Name: FUNCTION role(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.role() TO dashboard_user;


--
-- Name: FUNCTION uid(); Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON FUNCTION auth.uid() TO dashboard_user;


--
-- Name: FUNCTION armor(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea) TO dashboard_user;


--
-- Name: FUNCTION armor(bytea, text[], text[]); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.armor(bytea, text[], text[]) FROM postgres;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.armor(bytea, text[], text[]) TO dashboard_user;


--
-- Name: FUNCTION crypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.crypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.crypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION dearmor(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.dearmor(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.dearmor(text) TO dashboard_user;


--
-- Name: FUNCTION decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION decrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION digest(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.digest(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.digest(text, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION encrypt_iv(bytea, bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION gen_random_bytes(integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_bytes(integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_bytes(integer) TO dashboard_user;


--
-- Name: FUNCTION gen_random_uuid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_random_uuid() FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_random_uuid() TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text) TO dashboard_user;


--
-- Name: FUNCTION gen_salt(text, integer); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.gen_salt(text, integer) FROM postgres;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.gen_salt(text, integer) TO dashboard_user;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_cron_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_cron_access() TO dashboard_user;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.grant_pg_graphql_access() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION grant_pg_net_access(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION extensions.grant_pg_net_access() FROM supabase_admin;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO supabase_admin WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.grant_pg_net_access() TO dashboard_user;


--
-- Name: FUNCTION hmac(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION hmac(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.hmac(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.hmac(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements(showtext boolean, OUT userid oid, OUT dbid oid, OUT toplevel boolean, OUT queryid bigint, OUT query text, OUT plans bigint, OUT total_plan_time double precision, OUT min_plan_time double precision, OUT max_plan_time double precision, OUT mean_plan_time double precision, OUT stddev_plan_time double precision, OUT calls bigint, OUT total_exec_time double precision, OUT min_exec_time double precision, OUT max_exec_time double precision, OUT mean_exec_time double precision, OUT stddev_exec_time double precision, OUT rows bigint, OUT shared_blks_hit bigint, OUT shared_blks_read bigint, OUT shared_blks_dirtied bigint, OUT shared_blks_written bigint, OUT local_blks_hit bigint, OUT local_blks_read bigint, OUT local_blks_dirtied bigint, OUT local_blks_written bigint, OUT temp_blks_read bigint, OUT temp_blks_written bigint, OUT shared_blk_read_time double precision, OUT shared_blk_write_time double precision, OUT local_blk_read_time double precision, OUT local_blk_write_time double precision, OUT temp_blk_read_time double precision, OUT temp_blk_write_time double precision, OUT wal_records bigint, OUT wal_fpi bigint, OUT wal_bytes numeric, OUT jit_functions bigint, OUT jit_generation_time double precision, OUT jit_inlining_count bigint, OUT jit_inlining_time double precision, OUT jit_optimization_count bigint, OUT jit_optimization_time double precision, OUT jit_emission_count bigint, OUT jit_emission_time double precision, OUT jit_deform_count bigint, OUT jit_deform_time double precision, OUT stats_since timestamp with time zone, OUT minmax_stats_since timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_info(OUT dealloc bigint, OUT stats_reset timestamp with time zone) TO dashboard_user;


--
-- Name: FUNCTION pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) FROM postgres;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pg_stat_statements_reset(userid oid, dbid oid, queryid bigint, minmax_only boolean) TO dashboard_user;


--
-- Name: FUNCTION pgp_armor_headers(text, OUT key text, OUT value text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text) TO dashboard_user;


--
-- Name: FUNCTION pgp_key_id(bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_key_id(bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_key_id(bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_decrypt_bytea(bytea, bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt(text, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt(text, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea) TO dashboard_user;


--
-- Name: FUNCTION pgp_pub_encrypt_bytea(bytea, bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_decrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt(text, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt(text, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text) TO dashboard_user;


--
-- Name: FUNCTION pgp_sym_encrypt_bytea(bytea, text, text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) FROM postgres;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text) TO dashboard_user;


--
-- Name: FUNCTION pgrst_ddl_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_ddl_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION pgrst_drop_watch(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.pgrst_drop_watch() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: ACL; Schema: extensions; Owner: supabase_admin
--

GRANT ALL ON FUNCTION extensions.set_graphql_placeholder() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION uuid_generate_v1(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v1mc(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v1mc() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v1mc() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v3(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v3(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v4(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v4() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v4() TO dashboard_user;


--
-- Name: FUNCTION uuid_generate_v5(namespace uuid, name text); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_generate_v5(namespace uuid, name text) TO dashboard_user;


--
-- Name: FUNCTION uuid_nil(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_nil() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_nil() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_dns(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_dns() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_dns() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_oid(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_oid() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_oid() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_url(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_url() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_url() TO dashboard_user;


--
-- Name: FUNCTION uuid_ns_x500(); Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON FUNCTION extensions.uuid_ns_x500() FROM postgres;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION extensions.uuid_ns_x500() TO dashboard_user;


--
-- Name: FUNCTION graphql("operationName" text, query text, variables jsonb, extensions jsonb); Type: ACL; Schema: graphql_public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO postgres;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO anon;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO authenticated;
GRANT ALL ON FUNCTION graphql_public.graphql("operationName" text, query text, variables jsonb, extensions jsonb) TO service_role;


--
-- Name: FUNCTION pg_reload_conf(); Type: ACL; Schema: pg_catalog; Owner: supabase_admin
--

GRANT ALL ON FUNCTION pg_catalog.pg_reload_conf() TO postgres WITH GRANT OPTION;


--
-- Name: FUNCTION get_auth(p_usename text); Type: ACL; Schema: pgbouncer; Owner: supabase_admin
--

REVOKE ALL ON FUNCTION pgbouncer.get_auth(p_usename text) FROM PUBLIC;
GRANT ALL ON FUNCTION pgbouncer.get_auth(p_usename text) TO pgbouncer;


--
-- Name: FUNCTION check_usage_limits(p_action public.usage_action, p_model_used text, p_estimated_tokens integer, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.check_usage_limits(p_action public.usage_action, p_model_used text, p_estimated_tokens integer, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.check_usage_limits(p_action public.usage_action, p_model_used text, p_estimated_tokens integer, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.check_usage_limits(p_action public.usage_action, p_model_used text, p_estimated_tokens integer, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION ensure_conversation_workspace_owner(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_conversation_workspace_owner() TO anon;
GRANT ALL ON FUNCTION public.ensure_conversation_workspace_owner() TO authenticated;
GRANT ALL ON FUNCTION public.ensure_conversation_workspace_owner() TO service_role;


--
-- Name: FUNCTION ensure_user_profile(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.ensure_user_profile(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.ensure_user_profile(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.ensure_user_profile(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_current_subscription_tier(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_current_subscription_tier(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_current_subscription_tier(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_current_subscription_tier(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION get_subscription_limits(p_tier public.subscription_tier); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_subscription_limits(p_tier public.subscription_tier) TO anon;
GRANT ALL ON FUNCTION public.get_subscription_limits(p_tier public.subscription_tier) TO authenticated;
GRANT ALL ON FUNCTION public.get_subscription_limits(p_tier public.subscription_tier) TO service_role;


--
-- Name: FUNCTION get_usage_snapshot(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.get_usage_snapshot(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_usage_snapshot(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_usage_snapshot(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal) TO service_role;


--
-- Name: FUNCTION gin_extract_value_trgm(text, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_extract_value_trgm(text, internal) TO service_role;


--
-- Name: FUNCTION gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal) TO service_role;


--
-- Name: FUNCTION gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal) TO service_role;


--
-- Name: FUNCTION gtrgm_compress(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_compress(internal) TO service_role;


--
-- Name: FUNCTION gtrgm_consistent(internal, text, smallint, oid, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal) TO service_role;


--
-- Name: FUNCTION gtrgm_decompress(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_decompress(internal) TO service_role;


--
-- Name: FUNCTION gtrgm_distance(internal, text, smallint, oid, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal) TO service_role;


--
-- Name: FUNCTION gtrgm_options(internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_options(internal) TO service_role;


--
-- Name: FUNCTION gtrgm_penalty(internal, internal, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_penalty(internal, internal, internal) TO service_role;


--
-- Name: FUNCTION gtrgm_picksplit(internal, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_picksplit(internal, internal) TO service_role;


--
-- Name: FUNCTION gtrgm_same(public.gtrgm, public.gtrgm, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_same(public.gtrgm, public.gtrgm, internal) TO service_role;


--
-- Name: FUNCTION gtrgm_union(internal, internal); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO postgres;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO anon;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO authenticated;
GRANT ALL ON FUNCTION public.gtrgm_union(internal, internal) TO service_role;


--
-- Name: FUNCTION handle_new_auth_user(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.handle_new_auth_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_auth_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_auth_user() TO service_role;


--
-- Name: FUNCTION increment_usage(p_action public.usage_action, p_model_used text, p_document_count integer, p_estimated_tokens integer, p_metadata jsonb, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.increment_usage(p_action public.usage_action, p_model_used text, p_document_count integer, p_estimated_tokens integer, p_metadata jsonb, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.increment_usage(p_action public.usage_action, p_model_used text, p_document_count integer, p_estimated_tokens integer, p_metadata jsonb, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.increment_usage(p_action public.usage_action, p_model_used text, p_document_count integer, p_estimated_tokens integer, p_metadata jsonb, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION reset_daily_counters(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.reset_daily_counters(p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.reset_daily_counters(p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reset_daily_counters(p_user_id uuid) TO service_role;


--
-- Name: FUNCTION rls_auto_enable(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO authenticated;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO service_role;


--
-- Name: FUNCTION search_knowledge_chunks(p_query text, p_limit integer); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.search_knowledge_chunks(p_query text, p_limit integer) TO anon;
GRANT ALL ON FUNCTION public.search_knowledge_chunks(p_query text, p_limit integer) TO authenticated;
GRANT ALL ON FUNCTION public.search_knowledge_chunks(p_query text, p_limit integer) TO service_role;


--
-- Name: FUNCTION set_limit(real); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.set_limit(real) TO postgres;
GRANT ALL ON FUNCTION public.set_limit(real) TO anon;
GRANT ALL ON FUNCTION public.set_limit(real) TO authenticated;
GRANT ALL ON FUNCTION public.set_limit(real) TO service_role;


--
-- Name: FUNCTION set_updated_at(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.set_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_at() TO service_role;


--
-- Name: FUNCTION show_limit(); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.show_limit() TO postgres;
GRANT ALL ON FUNCTION public.show_limit() TO anon;
GRANT ALL ON FUNCTION public.show_limit() TO authenticated;
GRANT ALL ON FUNCTION public.show_limit() TO service_role;


--
-- Name: FUNCTION show_trgm(text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.show_trgm(text) TO postgres;
GRANT ALL ON FUNCTION public.show_trgm(text) TO anon;
GRANT ALL ON FUNCTION public.show_trgm(text) TO authenticated;
GRANT ALL ON FUNCTION public.show_trgm(text) TO service_role;


--
-- Name: FUNCTION similarity(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION public.similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity(text, text) TO service_role;


--
-- Name: FUNCTION similarity_dist(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO postgres;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity_dist(text, text) TO service_role;


--
-- Name: FUNCTION similarity_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.similarity_op(text, text) TO service_role;


--
-- Name: FUNCTION strict_word_similarity(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity(text, text) TO service_role;


--
-- Name: FUNCTION strict_word_similarity_commutator_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_commutator_op(text, text) TO service_role;


--
-- Name: FUNCTION strict_word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_commutator_op(text, text) TO service_role;


--
-- Name: FUNCTION strict_word_similarity_dist_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_dist_op(text, text) TO service_role;


--
-- Name: FUNCTION strict_word_similarity_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.strict_word_similarity_op(text, text) TO service_role;


--
-- Name: FUNCTION touch_conversation_after_message(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION public.touch_conversation_after_message() TO anon;
GRANT ALL ON FUNCTION public.touch_conversation_after_message() TO authenticated;
GRANT ALL ON FUNCTION public.touch_conversation_after_message() TO service_role;


--
-- Name: FUNCTION word_similarity(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.word_similarity(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity(text, text) TO service_role;


--
-- Name: FUNCTION word_similarity_commutator_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_commutator_op(text, text) TO service_role;


--
-- Name: FUNCTION word_similarity_dist_commutator_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_dist_commutator_op(text, text) TO service_role;


--
-- Name: FUNCTION word_similarity_dist_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_dist_op(text, text) TO service_role;


--
-- Name: FUNCTION word_similarity_op(text, text); Type: ACL; Schema: public; Owner: supabase_admin
--

GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO postgres;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO anon;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO authenticated;
GRANT ALL ON FUNCTION public.word_similarity_op(text, text) TO service_role;


--
-- Name: FUNCTION apply_rls(wal jsonb, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO anon;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO authenticated;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO service_role;
GRANT ALL ON FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer) TO supabase_realtime_admin;


--
-- Name: FUNCTION broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO postgres;
GRANT ALL ON FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text) TO dashboard_user;


--
-- Name: FUNCTION build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO postgres;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO anon;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO service_role;
GRANT ALL ON FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION "cast"(val text, type_ regtype); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO postgres;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO dashboard_user;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO anon;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO authenticated;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO service_role;
GRANT ALL ON FUNCTION realtime."cast"(val text, type_ regtype) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO anon;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO authenticated;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO service_role;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) TO supabase_realtime_admin;


--
-- Name: FUNCTION check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text, negate boolean) TO dashboard_user;


--
-- Name: FUNCTION is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO postgres;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO anon;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO authenticated;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO service_role;
GRANT ALL ON FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) TO supabase_realtime_admin;


--
-- Name: FUNCTION list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO postgres;
GRANT ALL ON FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) TO dashboard_user;


--
-- Name: FUNCTION quote_wal2json(entity regclass); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO postgres;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO anon;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO authenticated;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO service_role;
GRANT ALL ON FUNCTION realtime.quote_wal2json(entity regclass) TO supabase_realtime_admin;


--
-- Name: FUNCTION send(payload jsonb, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION send_binary(payload bytea, event text, topic text, private boolean); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO postgres;
GRANT ALL ON FUNCTION realtime.send_binary(payload bytea, event text, topic text, private boolean) TO dashboard_user;


--
-- Name: FUNCTION subscription_check_filters(); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO postgres;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO dashboard_user;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO anon;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO authenticated;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO service_role;
GRANT ALL ON FUNCTION realtime.subscription_check_filters() TO supabase_realtime_admin;


--
-- Name: FUNCTION to_regrole(role_name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO postgres;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO dashboard_user;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO anon;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO authenticated;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO service_role;
GRANT ALL ON FUNCTION realtime.to_regrole(role_name text) TO supabase_realtime_admin;


--
-- Name: FUNCTION topic(); Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON FUNCTION realtime.topic() TO postgres;
GRANT ALL ON FUNCTION realtime.topic() TO dashboard_user;


--
-- Name: FUNCTION wal2json_escape_identifier(name text); Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO postgres;
GRANT ALL ON FUNCTION realtime.wal2json_escape_identifier(name text) TO dashboard_user;


--
-- Name: FUNCTION _crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea, nonce bytea) TO service_role;


--
-- Name: FUNCTION create_secret(new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.create_secret(new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: FUNCTION update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid); Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO postgres WITH GRANT OPTION;
GRANT ALL ON FUNCTION vault.update_secret(secret_id uuid, new_secret text, new_name text, new_description text, new_key_id uuid) TO service_role;


--
-- Name: TABLE audit_log_entries; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.audit_log_entries TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.audit_log_entries TO postgres;
GRANT SELECT ON TABLE auth.audit_log_entries TO postgres WITH GRANT OPTION;


--
-- Name: TABLE custom_oauth_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.custom_oauth_providers TO postgres;
GRANT ALL ON TABLE auth.custom_oauth_providers TO dashboard_user;


--
-- Name: TABLE flow_state; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.flow_state TO postgres;
GRANT SELECT ON TABLE auth.flow_state TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.flow_state TO dashboard_user;


--
-- Name: TABLE identities; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.identities TO postgres;
GRANT SELECT ON TABLE auth.identities TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.identities TO dashboard_user;


--
-- Name: TABLE instances; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.instances TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.instances TO postgres;
GRANT SELECT ON TABLE auth.instances TO postgres WITH GRANT OPTION;


--
-- Name: TABLE mfa_amr_claims; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_amr_claims TO postgres;
GRANT SELECT ON TABLE auth.mfa_amr_claims TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_amr_claims TO dashboard_user;


--
-- Name: TABLE mfa_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_challenges TO postgres;
GRANT SELECT ON TABLE auth.mfa_challenges TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_challenges TO dashboard_user;


--
-- Name: TABLE mfa_factors; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.mfa_factors TO postgres;
GRANT SELECT ON TABLE auth.mfa_factors TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.mfa_factors TO dashboard_user;


--
-- Name: TABLE oauth_authorizations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_authorizations TO postgres;
GRANT ALL ON TABLE auth.oauth_authorizations TO dashboard_user;


--
-- Name: TABLE oauth_client_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_client_states TO postgres;
GRANT ALL ON TABLE auth.oauth_client_states TO dashboard_user;


--
-- Name: TABLE oauth_clients; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_clients TO postgres;
GRANT ALL ON TABLE auth.oauth_clients TO dashboard_user;


--
-- Name: TABLE oauth_consents; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.oauth_consents TO postgres;
GRANT ALL ON TABLE auth.oauth_consents TO dashboard_user;


--
-- Name: TABLE one_time_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.one_time_tokens TO postgres;
GRANT SELECT ON TABLE auth.one_time_tokens TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.one_time_tokens TO dashboard_user;


--
-- Name: TABLE refresh_tokens; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.refresh_tokens TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.refresh_tokens TO postgres;
GRANT SELECT ON TABLE auth.refresh_tokens TO postgres WITH GRANT OPTION;


--
-- Name: SEQUENCE refresh_tokens_id_seq; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO dashboard_user;
GRANT ALL ON SEQUENCE auth.refresh_tokens_id_seq TO postgres;


--
-- Name: TABLE saml_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_providers TO postgres;
GRANT SELECT ON TABLE auth.saml_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_providers TO dashboard_user;


--
-- Name: TABLE saml_relay_states; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.saml_relay_states TO postgres;
GRANT SELECT ON TABLE auth.saml_relay_states TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.saml_relay_states TO dashboard_user;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT SELECT ON TABLE auth.schema_migrations TO postgres WITH GRANT OPTION;


--
-- Name: TABLE sessions; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sessions TO postgres;
GRANT SELECT ON TABLE auth.sessions TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sessions TO dashboard_user;


--
-- Name: TABLE sso_domains; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_domains TO postgres;
GRANT SELECT ON TABLE auth.sso_domains TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_domains TO dashboard_user;


--
-- Name: TABLE sso_providers; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.sso_providers TO postgres;
GRANT SELECT ON TABLE auth.sso_providers TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE auth.sso_providers TO dashboard_user;


--
-- Name: TABLE users; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.users TO dashboard_user;
GRANT INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE auth.users TO postgres;
GRANT SELECT ON TABLE auth.users TO postgres WITH GRANT OPTION;


--
-- Name: TABLE webauthn_challenges; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_challenges TO postgres;
GRANT ALL ON TABLE auth.webauthn_challenges TO dashboard_user;


--
-- Name: TABLE webauthn_credentials; Type: ACL; Schema: auth; Owner: supabase_auth_admin
--

GRANT ALL ON TABLE auth.webauthn_credentials TO postgres;
GRANT ALL ON TABLE auth.webauthn_credentials TO dashboard_user;


--
-- Name: TABLE pg_stat_statements; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements TO dashboard_user;


--
-- Name: TABLE pg_stat_statements_info; Type: ACL; Schema: extensions; Owner: postgres
--

REVOKE ALL ON TABLE extensions.pg_stat_statements_info FROM postgres;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO postgres WITH GRANT OPTION;
GRANT ALL ON TABLE extensions.pg_stat_statements_info TO dashboard_user;


--
-- Name: TABLE chat_workspaces; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.chat_workspaces TO anon;
GRANT ALL ON TABLE public.chat_workspaces TO authenticated;
GRANT ALL ON TABLE public.chat_workspaces TO service_role;


--
-- Name: TABLE conversations; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.conversations TO anon;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.conversations TO service_role;


--
-- Name: TABLE knowledge_chunks; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knowledge_chunks TO anon;
GRANT ALL ON TABLE public.knowledge_chunks TO authenticated;
GRANT ALL ON TABLE public.knowledge_chunks TO service_role;


--
-- Name: TABLE knowledge_sources; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knowledge_sources TO anon;
GRANT ALL ON TABLE public.knowledge_sources TO authenticated;
GRANT ALL ON TABLE public.knowledge_sources TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.messages TO anon;
GRANT ALL ON TABLE public.messages TO authenticated;
GRANT ALL ON TABLE public.messages TO service_role;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.subscriptions TO anon;
GRANT ALL ON TABLE public.subscriptions TO authenticated;
GRANT ALL ON TABLE public.subscriptions TO service_role;


--
-- Name: TABLE usage_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.usage_logs TO anon;
GRANT ALL ON TABLE public.usage_logs TO authenticated;
GRANT ALL ON TABLE public.usage_logs TO service_role;


--
-- Name: TABLE user_memory; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_memory TO anon;
GRANT ALL ON TABLE public.user_memory TO authenticated;
GRANT ALL ON TABLE public.user_memory TO service_role;


--
-- Name: TABLE user_profiles; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.user_profiles TO anon;
GRANT ALL ON TABLE public.user_profiles TO authenticated;
GRANT ALL ON TABLE public.user_profiles TO service_role;


--
-- Name: TABLE messages; Type: ACL; Schema: realtime; Owner: supabase_realtime_admin
--

GRANT ALL ON TABLE realtime.messages TO postgres;
GRANT ALL ON TABLE realtime.messages TO dashboard_user;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO anon;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO authenticated;
GRANT SELECT,INSERT,UPDATE ON TABLE realtime.messages TO service_role;


--
-- Name: TABLE schema_migrations; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.schema_migrations TO postgres;
GRANT ALL ON TABLE realtime.schema_migrations TO dashboard_user;
GRANT SELECT ON TABLE realtime.schema_migrations TO anon;
GRANT SELECT ON TABLE realtime.schema_migrations TO authenticated;
GRANT SELECT ON TABLE realtime.schema_migrations TO service_role;
GRANT ALL ON TABLE realtime.schema_migrations TO supabase_realtime_admin;


--
-- Name: TABLE subscription; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON TABLE realtime.subscription TO postgres;
GRANT ALL ON TABLE realtime.subscription TO dashboard_user;
GRANT SELECT ON TABLE realtime.subscription TO anon;
GRANT SELECT ON TABLE realtime.subscription TO authenticated;
GRANT SELECT ON TABLE realtime.subscription TO service_role;
GRANT ALL ON TABLE realtime.subscription TO supabase_realtime_admin;


--
-- Name: SEQUENCE subscription_id_seq; Type: ACL; Schema: realtime; Owner: supabase_admin
--

GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO postgres;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO dashboard_user;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO anon;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE realtime.subscription_id_seq TO service_role;
GRANT ALL ON SEQUENCE realtime.subscription_id_seq TO supabase_realtime_admin;


--
-- Name: TABLE buckets; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.buckets FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.buckets TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.buckets TO service_role;
GRANT ALL ON TABLE storage.buckets TO authenticated;
GRANT ALL ON TABLE storage.buckets TO anon;
GRANT ALL ON TABLE storage.buckets TO postgres WITH GRANT OPTION;


--
-- Name: TABLE buckets_analytics; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.buckets_analytics TO service_role;
GRANT ALL ON TABLE storage.buckets_analytics TO authenticated;
GRANT ALL ON TABLE storage.buckets_analytics TO anon;


--
-- Name: TABLE buckets_vectors; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.buckets_vectors TO service_role;
GRANT SELECT ON TABLE storage.buckets_vectors TO authenticated;
GRANT SELECT ON TABLE storage.buckets_vectors TO anon;


--
-- Name: TABLE objects; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

REVOKE ALL ON TABLE storage.objects FROM supabase_storage_admin;
GRANT ALL ON TABLE storage.objects TO supabase_storage_admin WITH GRANT OPTION;
GRANT ALL ON TABLE storage.objects TO service_role;
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.objects TO anon;
GRANT ALL ON TABLE storage.objects TO postgres WITH GRANT OPTION;


--
-- Name: TABLE s3_multipart_uploads; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads TO anon;


--
-- Name: TABLE s3_multipart_uploads_parts; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT ALL ON TABLE storage.s3_multipart_uploads_parts TO service_role;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO authenticated;
GRANT SELECT ON TABLE storage.s3_multipart_uploads_parts TO anon;


--
-- Name: TABLE vector_indexes; Type: ACL; Schema: storage; Owner: supabase_storage_admin
--

GRANT SELECT ON TABLE storage.vector_indexes TO service_role;
GRANT SELECT ON TABLE storage.vector_indexes TO authenticated;
GRANT SELECT ON TABLE storage.vector_indexes TO anon;


--
-- Name: TABLE secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.secrets TO service_role;


--
-- Name: TABLE decrypted_secrets; Type: ACL; Schema: vault; Owner: supabase_admin
--

GRANT SELECT,REFERENCES,DELETE,TRUNCATE ON TABLE vault.decrypted_secrets TO postgres WITH GRANT OPTION;
GRANT SELECT,DELETE ON TABLE vault.decrypted_secrets TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: auth; Owner: supabase_auth_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_auth_admin IN SCHEMA auth GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON SEQUENCES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON FUNCTIONS TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: extensions; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA extensions GRANT ALL ON TABLES TO postgres WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: graphql_public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA graphql_public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON SEQUENCES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON FUNCTIONS TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: realtime; Owner: supabase_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA realtime GRANT ALL ON TABLES TO dashboard_user;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: storage; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA storage GRANT ALL ON TABLES TO service_role;


--
-- Name: ensure_rls; Type: EVENT TRIGGER; Schema: -; Owner: postgres
--

CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
         WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
   EXECUTE FUNCTION public.rls_auto_enable();


ALTER EVENT TRIGGER ensure_rls OWNER TO postgres;

--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


ALTER EVENT TRIGGER issue_graphql_placeholder OWNER TO supabase_admin;

--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


ALTER EVENT TRIGGER issue_pg_cron_access OWNER TO supabase_admin;

--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


ALTER EVENT TRIGGER issue_pg_graphql_access OWNER TO supabase_admin;

--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


ALTER EVENT TRIGGER issue_pg_net_access OWNER TO supabase_admin;

--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


ALTER EVENT TRIGGER pgrst_ddl_watch OWNER TO supabase_admin;

--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: supabase_admin
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


ALTER EVENT TRIGGER pgrst_drop_watch OWNER TO supabase_admin;

--
-- PostgreSQL database dump complete
--

\unrestrict aYc23NvddAFKDoG77RjZZEkZjnizWzsgmvEESHWU0z0KxzJ60eaoeSAex6FW9By

