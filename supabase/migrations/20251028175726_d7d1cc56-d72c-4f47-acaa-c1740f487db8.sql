-- Add location fields to posts table for PoS Globe feature
ALTER TABLE posts
ADD COLUMN location_city TEXT,
ADD COLUMN location_country TEXT,
ADD COLUMN location_country_code TEXT,
ADD COLUMN location_geohash TEXT,
ADD COLUMN location_lat NUMERIC(10, 7),
ADD COLUMN location_lng NUMERIC(10, 7),
ADD COLUMN has_location BOOLEAN DEFAULT FALSE;

-- Create index for geohash lookups (for clustering)
CREATE INDEX idx_posts_geohash ON posts(location_geohash) WHERE has_location = true;

-- Create index for athlete + location queries
CREATE INDEX idx_posts_author_location ON posts(author_id, has_location) WHERE has_location = true;

COMMENT ON COLUMN posts.location_city IS 'Normalized city name from location search';
COMMENT ON COLUMN posts.location_country IS 'Full country name';
COMMENT ON COLUMN posts.location_country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN posts.location_geohash IS 'Geohash for clustering (precision 5)';
COMMENT ON COLUMN posts.location_lat IS 'Centroid latitude';
COMMENT ON COLUMN posts.location_lng IS 'Centroid longitude';
COMMENT ON COLUMN posts.has_location IS 'Quick filter for location-tagged posts';