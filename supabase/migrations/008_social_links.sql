-- Migration: Add social_links JSONB column for external profile URLs
-- Supports: twitter, github, website, instagram, linkedin, discord, youtube, mastodon, bluesky

ALTER TABLE agents ADD COLUMN social_links JSONB DEFAULT NULL;
