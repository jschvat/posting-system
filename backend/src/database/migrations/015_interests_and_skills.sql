-- Migration: 015 - Interests and Skills
-- Description: Add hobbies, skills, favorite pets, and expertise with enumerated types
-- Date: 2025-10-21
-- Requires: existing users table

-- =====================================================
-- CREATE ENUM TYPES
-- =====================================================

-- Hobbies enum type
DO $$ BEGIN
    CREATE TYPE hobby_type AS ENUM (
        -- Technology & Computing
        'computers',
        'computer_programming',
        'web_development',
        'game_development',
        'robotics',
        'electronics',
        '3d_printing',
        'drones',
        'virtual_reality',
        'cryptocurrency',

        -- Creative & Arts
        'painting',
        'drawing',
        'photography',
        'videography',
        'graphic_design',
        'writing',
        'poetry',
        'blogging',
        'music',
        'singing',
        'playing_instrument',
        'composing_music',
        'dancing',
        'acting',
        'theater',
        'sculpting',
        'pottery',
        'calligraphy',

        -- Crafts & DIY
        'woodworking',
        'metalworking',
        'jewelry_making',
        'knitting',
        'crocheting',
        'sewing',
        'quilting',
        'embroidery',
        'candle_making',
        'soap_making',
        'leatherworking',
        'origami',
        'model_building',

        -- Outdoor & Nature
        'hiking',
        'camping',
        'backpacking',
        'rock_climbing',
        'mountaineering',
        'fishing',
        'hunting',
        'bird_watching',
        'gardening',
        'landscaping',
        'foraging',
        'astronomy',
        'stargazing',

        -- Sports & Fitness
        'running',
        'cycling',
        'swimming',
        'yoga',
        'martial_arts',
        'boxing',
        'weightlifting',
        'crossfit',
        'soccer',
        'basketball',
        'tennis',
        'golf',
        'skiing',
        'snowboarding',
        'skateboarding',
        'surfing',
        'kayaking',
        'sailing',

        -- Animals & Pets
        'bird_breeding',
        'dog_training',
        'cat_care',
        'aquariums',
        'fish_keeping',
        'reptile_keeping',
        'horse_riding',
        'beekeeping',

        -- Collecting
        'coin_collecting',
        'stamp_collecting',
        'antiques',
        'vinyl_records',
        'comic_books',
        'action_figures',
        'trading_cards',

        -- Games & Entertainment
        'video_games',
        'board_games',
        'card_games',
        'chess',
        'puzzles',
        'escape_rooms',

        -- Food & Drink
        'cooking',
        'baking',
        'grilling',
        'wine_tasting',
        'beer_brewing',
        'coffee_roasting',
        'mixology',

        -- Learning & Education
        'reading',
        'languages',
        'history',
        'philosophy',
        'science',
        'mathematics',
        'podcasts',

        -- Travel & Culture
        'traveling',
        'road_trips',
        'cultural_exploration',
        'volunteering',

        -- Other
        'meditation',
        'magic_tricks',
        'genealogy',
        'auto_restoration',
        'home_improvement',
        'interior_design',
        'fashion',
        'cosplay'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Skills enum type
DO $$ BEGIN
    CREATE TYPE skill_type AS ENUM (
        -- Programming Languages
        'javascript',
        'typescript',
        'python',
        'java',
        'csharp',
        'cpp',
        'c',
        'ruby',
        'php',
        'swift',
        'kotlin',
        'go',
        'rust',
        'scala',
        'r',
        'matlab',
        'sql',
        'html_css',

        -- Web Development
        'react',
        'angular',
        'vue',
        'nodejs',
        'express',
        'django',
        'flask',
        'spring',
        'asp_net',
        'laravel',
        'wordpress',

        -- Mobile Development
        'ios_development',
        'android_development',
        'react_native',
        'flutter',

        -- Database
        'postgresql',
        'mysql',
        'mongodb',
        'redis',
        'oracle',
        'sql_server',

        -- Cloud & DevOps
        'aws',
        'azure',
        'google_cloud',
        'docker',
        'kubernetes',
        'jenkins',
        'git',
        'ci_cd',
        'terraform',

        -- Data Science & AI
        'machine_learning',
        'deep_learning',
        'data_analysis',
        'data_visualization',
        'nlp',
        'computer_vision',
        'tensorflow',
        'pytorch',

        -- Design
        'ui_ux_design',
        'graphic_design',
        'web_design',
        'photoshop',
        'illustrator',
        'figma',
        'sketch',
        '3d_modeling',
        'animation',
        'video_editing',

        -- Business & Management
        'project_management',
        'agile',
        'scrum',
        'product_management',
        'business_analysis',
        'marketing',
        'digital_marketing',
        'seo',
        'content_marketing',
        'sales',
        'customer_service',
        'leadership',
        'team_management',

        -- Communication
        'public_speaking',
        'technical_writing',
        'copywriting',
        'presentation',
        'negotiation',

        -- Creative
        'photography',
        'videography',
        'music_production',
        'sound_design',
        'writing',

        -- Engineering
        'mechanical_engineering',
        'electrical_engineering',
        'civil_engineering',
        'chemical_engineering',
        'cad',
        'autocad',

        -- Finance & Accounting
        'accounting',
        'bookkeeping',
        'financial_analysis',
        'excel',
        'quickbooks',

        -- Languages
        'spanish',
        'french',
        'german',
        'chinese',
        'japanese',
        'korean',
        'arabic',
        'russian',
        'portuguese',
        'italian',

        -- Other
        'teaching',
        'research',
        'troubleshooting',
        'problem_solving',
        'critical_thinking',
        'data_entry',
        'typing'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Favorite Pets enum type
DO $$ BEGIN
    CREATE TYPE pet_type AS ENUM (
        -- Dogs
        'dog',
        'labrador',
        'german_shepherd',
        'golden_retriever',
        'bulldog',
        'beagle',
        'poodle',
        'rottweiler',
        'dachshund',
        'husky',
        'chihuahua',
        'corgi',
        'border_collie',
        'great_dane',
        'doberman',

        -- Cats
        'cat',
        'persian_cat',
        'maine_coon',
        'siamese_cat',
        'ragdoll_cat',
        'bengal_cat',
        'british_shorthair',
        'sphynx_cat',

        -- Birds
        'parrot',
        'parakeet',
        'cockatiel',
        'canary',
        'finch',
        'lovebird',
        'macaw',
        'cockatoo',
        'budgie',
        'african_grey',

        -- Small Mammals
        'rabbit',
        'hamster',
        'guinea_pig',
        'ferret',
        'gerbil',
        'chinchilla',
        'hedgehog',
        'mouse',
        'rat',

        -- Reptiles
        'snake',
        'lizard',
        'gecko',
        'bearded_dragon',
        'iguana',
        'turtle',
        'tortoise',
        'chameleon',

        -- Aquatic
        'fish',
        'goldfish',
        'betta_fish',
        'tropical_fish',
        'koi',

        -- Amphibians
        'frog',
        'toad',
        'salamander',
        'axolotl',

        -- Farm Animals
        'horse',
        'pony',
        'goat',
        'sheep',
        'chicken',
        'duck',
        'pig',
        'cow',

        -- Other
        'tarantula',
        'hermit_crab',
        'sugar_glider',
        'pot_bellied_pig'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Expertise enum type
DO $$ BEGIN
    CREATE TYPE expertise_type AS ENUM (
        -- Technology
        'software_engineering',
        'full_stack_development',
        'frontend_development',
        'backend_development',
        'mobile_development',
        'game_development',
        'devops',
        'cloud_architecture',
        'cybersecurity',
        'network_security',
        'information_security',
        'penetration_testing',
        'blockchain',
        'cryptocurrency',

        -- Data & AI
        'data_science',
        'machine_learning',
        'artificial_intelligence',
        'data_engineering',
        'big_data',
        'business_intelligence',
        'data_analytics',
        'statistics',

        -- Design
        'user_experience',
        'user_interface',
        'product_design',
        'graphic_design',
        'motion_graphics',
        '3d_design',
        'industrial_design',
        'interior_design',
        'architecture',

        -- Business & Management
        'business_strategy',
        'project_management',
        'product_management',
        'operations_management',
        'supply_chain',
        'logistics',
        'entrepreneurship',
        'startup_advisory',
        'venture_capital',

        -- Marketing & Sales
        'digital_marketing',
        'content_strategy',
        'social_media_marketing',
        'brand_management',
        'growth_hacking',
        'seo_sem',
        'email_marketing',
        'sales_strategy',
        'business_development',

        -- Finance
        'financial_analysis',
        'investment_banking',
        'portfolio_management',
        'accounting',
        'tax_planning',
        'auditing',
        'corporate_finance',
        'trading',

        -- Healthcare
        'medicine',
        'nursing',
        'surgery',
        'pediatrics',
        'cardiology',
        'neurology',
        'psychiatry',
        'physical_therapy',
        'nutrition',
        'pharmacy',

        -- Science & Research
        'biology',
        'chemistry',
        'physics',
        'environmental_science',
        'neuroscience',
        'genetics',
        'biotechnology',
        'research_methodology',

        -- Engineering
        'mechanical_engineering',
        'electrical_engineering',
        'civil_engineering',
        'chemical_engineering',
        'aerospace_engineering',
        'biomedical_engineering',
        'robotics',
        'automation',

        -- Legal
        'law',
        'corporate_law',
        'intellectual_property',
        'contract_law',
        'tax_law',
        'criminal_law',
        'compliance',

        -- Education
        'teaching',
        'curriculum_development',
        'educational_technology',
        'training_development',
        'academic_research',

        -- Creative
        'writing',
        'journalism',
        'creative_writing',
        'copywriting',
        'photography',
        'videography',
        'film_production',
        'music_production',
        'sound_engineering',

        -- Consulting
        'management_consulting',
        'it_consulting',
        'hr_consulting',
        'strategy_consulting',

        -- Human Resources
        'talent_acquisition',
        'organizational_development',
        'compensation_benefits',
        'employee_relations',

        -- Real Estate
        'real_estate',
        'property_management',
        'real_estate_investing',

        -- Manufacturing
        'manufacturing',
        'quality_assurance',
        'lean_manufacturing',
        'six_sigma',

        -- Other
        'customer_success',
        'technical_support',
        'system_administration',
        'database_administration'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- ADD COLUMNS TO USERS TABLE
-- =====================================================

-- Add array columns for interests and skills
ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies hobby_type[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills skill_type[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorite_pets pet_type[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS expertise expertise_type[];

-- Create indexes for array columns (using GIN for efficient array searches)
CREATE INDEX IF NOT EXISTS idx_users_hobbies ON users USING GIN (hobbies);
CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN (skills);
CREATE INDEX IF NOT EXISTS idx_users_favorite_pets ON users USING GIN (favorite_pets);
CREATE INDEX IF NOT EXISTS idx_users_expertise ON users USING GIN (expertise);

-- Add comments for documentation
COMMENT ON COLUMN users.hobbies IS 'Array of user hobbies and interests';
COMMENT ON COLUMN users.skills IS 'Array of user professional skills';
COMMENT ON COLUMN users.favorite_pets IS 'Array of user favorite pet types';
COMMENT ON COLUMN users.expertise IS 'Array of user areas of expertise';
