#!/usr/bin/env ruby
# frozen_string_literal: true

# asc-revoke-stale-dev-certs.rb
#
# Self-heal for the TestFlight `beta` CI signing cap.
#
# WHY THIS EXISTS
# ---------------
# The `beta` lane archives with automatic signing + `-allowProvisioningUpdates`.
# Every GitHub-hosted runner is clean (no keychain), so Xcode mints a BRAND-NEW
# "Apple Development: Created via API" certificate on EVERY run. Apple caps the
# number of certificates per account (this account capped at 11) — so after ~10
# nightly builds the next archive dies with:
#
#   error: Choose a certificate to revoke. Your account has reached the
#          maximum number of certificates.
#
# These CI-minted dev certs are single-use throwaways (a fresh runner never
# reuses one), so this script revokes the stale ones BEFORE the build, keeping
# the account permanently under the cap. Real developers get NAMED certs
# ("Apple Development: <person>"), which this script never touches.
#
# SAFETY
# ------
#  * Only DEVELOPMENT certs named exactly "Apple Development: Created via API"
#    are candidates — named human certs and any distribution cert are ignored.
#  * The newest KEEP_RECENT throwaways are kept (default 2) so a concurrent
#    build's just-minted cert is never revoked mid-run.
#  * Best-effort: always exits 0. A cleanup hiccup must never fail a build; if
#    the account is genuinely at the cap, the build's own archive step will fail
#    loudly with the Apple error above.
#
# ENV
#   ASC_API_KEY_ID     App Store Connect API key id       (required)
#   ASC_API_ISSUER     App Store Connect issuer id        (required)
#   ASC_API_KEY_PATH   Path to AuthKey_<id>.p8            (optional; defaults to
#                      ~/.appstoreconnect/private_keys/AuthKey_<ASC_API_KEY_ID>.p8)
#   ASC_CERT_KEEP_RECENT  How many newest throwaways to keep (optional; default 2)

require "jwt"
require "openssl"
require "json"
require "net/http"
require "uri"
require "time"

CANDIDATE_NAME = "Apple Development: Created via API"
API_BASE = "https://api.appstoreconnect.apple.com/v1/certificates"

def skip(msg)
  warn "[cert-selfheal] SKIP — #{msg}"
  exit 0
end

key_id    = ENV["ASC_API_KEY_ID"].to_s.strip
issuer_id = ENV["ASC_API_ISSUER"].to_s.strip
skip("ASC_API_KEY_ID / ASC_API_ISSUER not set") if key_id.empty? || issuer_id.empty?

key_path = ENV["ASC_API_KEY_PATH"]
key_path = File.expand_path("~/.appstoreconnect/private_keys/AuthKey_#{key_id}.p8") if key_path.to_s.empty?
skip("key file not found at #{key_path}") unless File.exist?(key_path)

keep_recent = (ENV["ASC_CERT_KEEP_RECENT"] || "2").to_i
keep_recent = 0 if keep_recent.negative?

def jwt_token(key_id, issuer_id, key_path)
  private_key = OpenSSL::PKey::EC.new(File.read(key_path))
  now = Time.now.to_i
  payload = { iss: issuer_id, iat: now, exp: now + 300, aud: "appstoreconnect-v1" }
  header  = { kid: key_id, typ: "JWT" }
  JWT.encode(payload, private_key, "ES256", header)
end

def http_request(method, url, token)
  uri = URI(url)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  req = case method
        when :get    then Net::HTTP::Get.new(uri)
        when :delete then Net::HTTP::Delete.new(uri)
        end
  req["Authorization"] = "Bearer #{token}"
  http.request(req)
end

begin
  token = jwt_token(key_id, issuer_id, key_path)
  resp = http_request(:get, "#{API_BASE}?limit=200", token)
  unless resp.code.to_i == 200
    skip("list certificates returned HTTP #{resp.code}: #{resp.body.to_s[0, 200]}")
  end

  certs = JSON.parse(resp.body).fetch("data", [])
  dev_total = certs.count { |c| c.dig("attributes", "certificateType") == "DEVELOPMENT" }
  candidates = certs.select do |c|
    a = c["attributes"] || {}
    a["certificateType"] == "DEVELOPMENT" && a["name"] == CANDIDATE_NAME
  end

  # Newest first by expiration (Apple Development expiry == creation + 1y, so
  # expiration order == creation order). Keep the newest KEEP_RECENT.
  candidates.sort_by! { |c| c.dig("attributes", "expirationDate").to_s }.reverse!
  stale = candidates.drop(keep_recent)

  puts "[cert-selfheal] account dev certs=#{dev_total}, throwaway candidates=#{candidates.size}, " \
       "keeping newest #{keep_recent}, revoking #{stale.size}"

  revoked = 0
  stale.each do |c|
    cid = c["id"]
    exp = c.dig("attributes", "expirationDate").to_s[0, 10]
    r = http_request(:delete, "#{API_BASE}/#{cid}", jwt_token(key_id, issuer_id, key_path))
    if r.code.to_i == 204
      revoked += 1
      puts "  revoked #{cid} (exp #{exp})"
    else
      warn "  FAILED  #{cid} -> HTTP #{r.code} #{r.body.to_s[0, 160]}"
    end
  end
  puts "[cert-selfheal] done — revoked #{revoked}/#{stale.size}"
rescue StandardError => e
  # Never fail the build over housekeeping.
  warn "[cert-selfheal] non-fatal error: #{e.class}: #{e.message}"
end

exit 0
