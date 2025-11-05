--
-- PostgreSQL database dump
--

\restrict HAHJJivuBOx92GGloFJqGNxxqeND9qzYEnF2GAjcKpnozaTMPVbRhshd6qZqHxd

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ltree; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;


--
-- Name: EXTENSION ltree; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION ltree IS 'data type for hierarchical tree-like structures';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: expertise_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.expertise_type AS ENUM (
    'software_engineering',
    'software_architecture',
    'software_development',
    'full_stack_development',
    'frontend_development',
    'backend_development',
    'mobile_development',
    'ios_development',
    'android_development',
    'web_development',
    'game_development',
    'embedded_systems',
    'firmware_development',
    'systems_programming',
    'application_development',
    'desktop_application_development',
    'distributed_systems',
    'microservices_architecture',
    'serverless_architecture',
    'cloud_native_development',
    'api_development',
    'devops',
    'site_reliability_engineering',
    'platform_engineering',
    'cloud_engineering',
    'cloud_architecture',
    'solutions_architecture',
    'enterprise_architecture',
    'technical_architecture',
    'cybersecurity',
    'information_security',
    'network_security',
    'application_security',
    'cloud_security',
    'security_architecture',
    'penetration_testing',
    'ethical_hacking',
    'vulnerability_assessment',
    'security_operations',
    'incident_response',
    'threat_intelligence',
    'malware_analysis',
    'reverse_engineering',
    'cryptography',
    'blockchain',
    'cryptocurrency',
    'smart_contracts',
    'defi',
    'nft',
    'web3',
    'data_science',
    'data_engineering',
    'data_analytics',
    'data_architecture',
    'big_data',
    'data_warehousing',
    'business_intelligence',
    'data_visualization',
    'machine_learning',
    'deep_learning',
    'artificial_intelligence',
    'natural_language_processing',
    'computer_vision',
    'speech_recognition',
    'recommendation_systems',
    'predictive_analytics',
    'prescriptive_analytics',
    'statistical_analysis',
    'quantitative_analysis',
    'data_modeling',
    'etl_development',
    'mlops',
    'ai_ethics',
    'user_experience',
    'user_interface',
    'ux_ui_design',
    'ux_research',
    'user_research',
    'usability_engineering',
    'interaction_design',
    'information_architecture',
    'service_design',
    'design_thinking',
    'product_design',
    'industrial_design',
    'graphic_design',
    'visual_design',
    'brand_design',
    'brand_identity',
    'motion_graphics',
    'animation',
    '3d_design',
    '3d_visualization',
    'game_design',
    'level_design',
    'ui_engineering',
    'design_systems',
    'accessibility_design',
    'business_strategy',
    'corporate_strategy',
    'competitive_strategy',
    'strategic_planning',
    'business_transformation',
    'digital_transformation',
    'organizational_transformation',
    'change_leadership',
    'project_management',
    'program_management',
    'portfolio_management',
    'pmo_management',
    'agile_coaching',
    'scrum_mastering',
    'product_management',
    'product_strategy',
    'product_development',
    'product_marketing',
    'innovation_management',
    'r_and_d_management',
    'operations_management',
    'operations_strategy',
    'process_optimization',
    'process_reengineering',
    'lean_management',
    'six_sigma',
    'continuous_improvement',
    'supply_chain_management',
    'supply_chain_strategy',
    'logistics',
    'procurement',
    'vendor_management',
    'contract_management',
    'risk_management',
    'enterprise_risk_management',
    'compliance_management',
    'governance',
    'internal_controls',
    'quality_management',
    'quality_assurance',
    'performance_management',
    'marketing_strategy',
    'brand_strategy',
    'brand_management',
    'digital_marketing',
    'content_marketing',
    'content_strategy',
    'social_media_marketing',
    'social_media_strategy',
    'influencer_marketing',
    'email_marketing',
    'marketing_automation',
    'growth_marketing',
    'performance_marketing',
    'paid_advertising',
    'search_engine_marketing',
    'search_engine_optimization',
    'conversion_rate_optimization',
    'web_analytics',
    'marketing_analytics',
    'customer_analytics',
    'market_research',
    'consumer_insights',
    'competitive_intelligence',
    'go_to_market_strategy',
    'demand_generation',
    'lead_generation',
    'account_based_marketing',
    'public_relations',
    'corporate_communications',
    'crisis_communications',
    'media_relations',
    'investor_relations',
    'sales_strategy',
    'sales_operations',
    'sales_enablement',
    'enterprise_sales',
    'b2b_sales',
    'b2c_sales',
    'saas_sales',
    'channel_sales',
    'partner_management',
    'business_development',
    'strategic_partnerships',
    'customer_success',
    'customer_experience',
    'customer_service',
    'account_management',
    'corporate_finance',
    'financial_planning_and_analysis',
    'fpa',
    'financial_modeling',
    'valuation',
    'mergers_and_acquisitions',
    'm_and_a',
    'investment_banking',
    'equity_research',
    'private_equity',
    'venture_capital',
    'asset_management',
    'wealth_management',
    'financial_advisory',
    'treasury_management',
    'cash_management',
    'credit_analysis',
    'credit_risk',
    'market_risk',
    'operational_risk',
    'compliance',
    'regulatory_compliance',
    'internal_audit',
    'external_audit',
    'forensic_accounting',
    'tax_planning',
    'tax_strategy',
    'international_tax',
    'transfer_pricing',
    'accounting',
    'financial_accounting',
    'management_accounting',
    'cost_accounting',
    'controller',
    'cfo',
    'ifrs',
    'gaap',
    'financial_reporting',
    'sec_reporting',
    'sarbanes_oxley',
    'budgeting',
    'forecasting',
    'trading',
    'equity_trading',
    'fixed_income',
    'derivatives',
    'commodities',
    'forex',
    'quantitative_trading',
    'algorithmic_trading',
    'high_frequency_trading',
    'medicine',
    'clinical_medicine',
    'emergency_medicine',
    'family_medicine',
    'internal_medicine',
    'pediatrics',
    'geriatrics',
    'obstetrics_gynecology',
    'psychiatry',
    'neurology',
    'cardiology',
    'oncology',
    'radiology',
    'pathology',
    'anesthesiology',
    'surgery',
    'general_surgery',
    'orthopedic_surgery',
    'neurosurgery',
    'cardiothoracic_surgery',
    'plastic_surgery',
    'dermatology',
    'ophthalmology',
    'otolaryngology',
    'urology',
    'nephrology',
    'gastroenterology',
    'endocrinology',
    'rheumatology',
    'hematology',
    'infectious_disease',
    'pulmonology',
    'nursing',
    'nurse_practitioner',
    'physician_assistant',
    'physical_therapy',
    'occupational_therapy',
    'speech_therapy',
    'pharmacy',
    'clinical_pharmacy',
    'pharmacology',
    'nutrition',
    'dietetics',
    'public_health',
    'epidemiology',
    'health_policy',
    'healthcare_administration',
    'hospital_administration',
    'medical_research',
    'clinical_research',
    'medical_writing',
    'medical_affairs',
    'research',
    'scientific_research',
    'academic_research',
    'applied_research',
    'basic_research',
    'biology',
    'molecular_biology',
    'cell_biology',
    'microbiology',
    'immunology',
    'genetics',
    'genomics',
    'proteomics',
    'bioinformatics',
    'computational_biology',
    'biotechnology',
    'bioengineering',
    'biochemistry',
    'chemistry',
    'organic_chemistry',
    'inorganic_chemistry',
    'analytical_chemistry',
    'physical_chemistry',
    'polymer_chemistry',
    'materials_science',
    'nanotechnology',
    'physics',
    'theoretical_physics',
    'experimental_physics',
    'quantum_physics',
    'nuclear_physics',
    'particle_physics',
    'astrophysics',
    'cosmology',
    'astronomy',
    'earth_science',
    'geology',
    'geophysics',
    'meteorology',
    'climatology',
    'oceanography',
    'environmental_science',
    'ecology',
    'conservation_biology',
    'neuroscience',
    'cognitive_science',
    'psychology',
    'clinical_psychology',
    'developmental_psychology',
    'social_psychology',
    'organizational_psychology',
    'behavioral_science',
    'mechanical_engineering',
    'automotive_engineering',
    'aerospace_engineering',
    'marine_engineering',
    'hvac_engineering',
    'electrical_engineering',
    'power_systems',
    'power_electronics',
    'control_systems',
    'signal_processing',
    'telecommunications',
    'rf_engineering',
    'electronics_engineering',
    'vlsi_design',
    'analog_design',
    'digital_design',
    'civil_engineering',
    'structural_engineering',
    'geotechnical_engineering',
    'transportation_engineering',
    'water_resources_engineering',
    'environmental_engineering',
    'chemical_engineering',
    'process_engineering',
    'petroleum_engineering',
    'biomedical_engineering',
    'medical_device_development',
    'industrial_engineering',
    'manufacturing_engineering',
    'quality_engineering',
    'systems_engineering',
    'reliability_engineering',
    'safety_engineering',
    'robotics_engineering',
    'mechatronics',
    'automation_engineering',
    'materials_engineering',
    'metallurgical_engineering',
    'nuclear_engineering',
    'mining_engineering',
    'law',
    'legal_practice',
    'litigation',
    'trial_law',
    'appellate_practice',
    'corporate_law',
    'mergers_and_acquisitions_law',
    'securities_law',
    'banking_law',
    'finance_law',
    'commercial_law',
    'contract_law',
    'intellectual_property',
    'patent_law',
    'trademark_law',
    'copyright_law',
    'trade_secrets',
    'technology_law',
    'software_licensing',
    'privacy_law',
    'data_protection',
    'gdpr',
    'employment_law',
    'labor_law',
    'immigration_law',
    'real_estate_law',
    'property_law',
    'tax_law',
    'estate_planning',
    'trusts_and_estates',
    'family_law',
    'criminal_law',
    'criminal_defense',
    'prosecution',
    'environmental_law',
    'energy_law',
    'healthcare_law',
    'medical_malpractice',
    'administrative_law',
    'regulatory_law',
    'antitrust',
    'competition_law',
    'international_law',
    'arbitration',
    'mediation',
    'alternative_dispute_resolution',
    'teaching',
    'higher_education',
    'k12_education',
    'early_childhood_education',
    'special_education',
    'adult_education',
    'vocational_training',
    'curriculum_development',
    'instructional_design',
    'educational_technology',
    'e_learning',
    'online_education',
    'education_administration',
    'academic_advising',
    'student_affairs',
    'education_policy',
    'education_research',
    'management_consulting',
    'strategy_consulting',
    'operations_consulting',
    'technology_consulting',
    'it_consulting',
    'digital_consulting',
    'transformation_consulting',
    'change_management_consulting',
    'hr_consulting',
    'organizational_development',
    'talent_management',
    'compensation_and_benefits',
    'executive_search',
    'recruitment',
    'real_estate',
    'real_estate_development',
    'commercial_real_estate',
    'residential_real_estate',
    'property_management',
    'real_estate_investment',
    'construction_management',
    'project_management_construction',
    'general_contracting',
    'architecture',
    'landscape_architecture',
    'urban_planning',
    'city_planning',
    'journalism',
    'broadcast_journalism',
    'investigative_journalism',
    'photojournalism',
    'sports_journalism',
    'film_production',
    'television_production',
    'video_production',
    'cinematography',
    'directing',
    'screenwriting',
    'editing',
    'sound_design',
    'music_production',
    'audio_engineering',
    'broadcasting',
    'podcasting',
    'entrepreneurship',
    'startup_founding',
    'small_business_management',
    'franchising',
    'non_profit_management',
    'social_entrepreneurship',
    'impact_investing',
    'sustainability',
    'esg',
    'corporate_social_responsibility',
    'community_development',
    'international_development',
    'humanitarian_work',
    'social_work',
    'counseling',
    'therapy',
    'life_coaching',
    'executive_coaching',
    'career_coaching',
    'agriculture',
    'agribusiness',
    'farming',
    'veterinary_medicine',
    'animal_science',
    'forestry',
    'wildlife_management',
    'hospitality_management',
    'hotel_management',
    'restaurant_management',
    'culinary_arts',
    'event_planning',
    'tourism',
    'travel_industry',
    'aviation',
    'pilot',
    'air_traffic_control',
    'maritime',
    'shipping',
    'logistics_management'
);


--
-- Name: hobby_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.hobby_type AS ENUM (
    'computers',
    'computer_programming',
    'web_development',
    'mobile_app_development',
    'game_development',
    'software_engineering',
    'robotics',
    'electronics',
    'arduino',
    'raspberry_pi',
    '3d_printing',
    'cnc_machining',
    'drones',
    'fpv_racing',
    'virtual_reality',
    'augmented_reality',
    'cryptocurrency',
    'blockchain',
    'ethical_hacking',
    'cybersecurity',
    'networking',
    'home_automation',
    'smart_home',
    'ham_radio',
    'amateur_radio',
    'retro_computing',
    'vintage_electronics',
    'circuit_design',
    'pcb_design',
    'soldering',
    'painting',
    'oil_painting',
    'watercolor',
    'acrylic_painting',
    'drawing',
    'sketching',
    'charcoal_drawing',
    'pen_and_ink',
    'digital_art',
    'illustration',
    'animation',
    'cartoon_drawing',
    'manga',
    'anime_art',
    'comic_art',
    'graffiti',
    'street_art',
    'mural_painting',
    'photography',
    'landscape_photography',
    'portrait_photography',
    'wildlife_photography',
    'macro_photography',
    'astrophotography',
    'street_photography',
    'film_photography',
    'drone_photography',
    'videography',
    'filmmaking',
    'video_editing',
    'cinematography',
    'graphic_design',
    'logo_design',
    'typography',
    'sculpting',
    'clay_sculpting',
    'wood_carving',
    'stone_carving',
    'ice_sculpting',
    'pottery',
    'ceramics',
    'glassblowing',
    'stained_glass',
    'music',
    'singing',
    'playing_piano',
    'playing_guitar',
    'playing_bass',
    'playing_drums',
    'playing_violin',
    'playing_cello',
    'playing_saxophone',
    'playing_trumpet',
    'playing_flute',
    'playing_ukulele',
    'playing_banjo',
    'dj_mixing',
    'music_production',
    'beat_making',
    'composing_music',
    'songwriting',
    'rapping',
    'beatboxing',
    'karaoke',
    'dancing',
    'ballet',
    'hip_hop_dance',
    'ballroom_dancing',
    'salsa',
    'tango',
    'breakdancing',
    'contemporary_dance',
    'tap_dancing',
    'swing_dancing',
    'acting',
    'theater',
    'improv',
    'stand_up_comedy',
    'magic_tricks',
    'juggling',
    'puppetry',
    'ventriloquism',
    'writing',
    'creative_writing',
    'fiction_writing',
    'novel_writing',
    'short_stories',
    'poetry',
    'screenwriting',
    'playwriting',
    'blogging',
    'journalism',
    'copywriting',
    'technical_writing',
    'memoir_writing',
    'fan_fiction',
    'calligraphy',
    'hand_lettering',
    'bookbinding',
    'woodworking',
    'furniture_making',
    'wood_turning',
    'carpentry',
    'metalworking',
    'blacksmithing',
    'welding',
    'machining',
    'jewelry_making',
    'silversmithing',
    'goldsmithing',
    'beading',
    'wire_wrapping',
    'resin_art',
    'knitting',
    'crocheting',
    'sewing',
    'quilting',
    'embroidery',
    'cross_stitch',
    'needlepoint',
    'macrame',
    'weaving',
    'spinning_yarn',
    'felting',
    'tie_dye',
    'batik',
    'candle_making',
    'soap_making',
    'perfume_making',
    'cosmetics_making',
    'leatherworking',
    'leather_tooling',
    'origami',
    'paper_crafts',
    'scrapbooking',
    'card_making',
    'model_building',
    'scale_modeling',
    'miniatures',
    'diorama_building',
    'rc_cars',
    'rc_planes',
    'rc_boats',
    'lego_building',
    'upholstery',
    'furniture_restoration',
    'stenciling',
    'hiking',
    'backpacking',
    'camping',
    'bushcraft',
    'survival_skills',
    'rock_climbing',
    'bouldering',
    'mountaineering',
    'ice_climbing',
    'caving',
    'spelunking',
    'fishing',
    'fly_fishing',
    'ice_fishing',
    'deep_sea_fishing',
    'hunting',
    'bow_hunting',
    'bird_watching',
    'wildlife_watching',
    'nature_photography',
    'gardening',
    'vegetable_gardening',
    'flower_gardening',
    'hydroponics',
    'aquaponics',
    'permaculture',
    'landscaping',
    'bonsai',
    'orchid_growing',
    'mushroom_foraging',
    'foraging',
    'herbalism',
    'astronomy',
    'stargazing',
    'telescope_making',
    'geocaching',
    'orienteering',
    'metal_detecting',
    'fossil_hunting',
    'rockhounding',
    'mineral_collecting',
    'running',
    'marathon_running',
    'trail_running',
    'ultra_running',
    'sprinting',
    'jogging',
    'cycling',
    'mountain_biking',
    'road_cycling',
    'bmx',
    'triathlon',
    'swimming',
    'diving',
    'scuba_diving',
    'freediving',
    'snorkeling',
    'yoga',
    'pilates',
    'tai_chi',
    'qigong',
    'martial_arts',
    'karate',
    'judo',
    'taekwondo',
    'brazilian_jiu_jitsu',
    'kickboxing',
    'muay_thai',
    'boxing',
    'mma',
    'wrestling',
    'fencing',
    'kendo',
    'archery',
    'weightlifting',
    'powerlifting',
    'bodybuilding',
    'crossfit',
    'calisthenics',
    'parkour',
    'soccer',
    'football',
    'basketball',
    'baseball',
    'softball',
    'volleyball',
    'tennis',
    'badminton',
    'table_tennis',
    'ping_pong',
    'squash',
    'racquetball',
    'golf',
    'disc_golf',
    'bowling',
    'cricket',
    'rugby',
    'hockey',
    'ice_hockey',
    'field_hockey',
    'lacrosse',
    'skiing',
    'downhill_skiing',
    'cross_country_skiing',
    'snowboarding',
    'snowshoeing',
    'ice_skating',
    'figure_skating',
    'skateboarding',
    'longboarding',
    'surfing',
    'windsurfing',
    'kitesurfing',
    'paddleboarding',
    'kayaking',
    'canoeing',
    'rowing',
    'sailing',
    'yachting',
    'wakeboarding',
    'water_skiing',
    'jet_skiing',
    'paragliding',
    'hang_gliding',
    'skydiving',
    'base_jumping',
    'bungee_jumping',
    'rock_crawling',
    'off_roading',
    'motocross',
    'go_karting',
    'dog_training',
    'dog_showing',
    'dog_agility',
    'cat_care',
    'cat_showing',
    'bird_breeding',
    'falconry',
    'pigeon_racing',
    'chicken_keeping',
    'aquariums',
    'fish_keeping',
    'reef_keeping',
    'aquascaping',
    'koi_keeping',
    'reptile_keeping',
    'snake_keeping',
    'lizard_keeping',
    'turtle_keeping',
    'horse_riding',
    'dressage',
    'show_jumping',
    'barrel_racing',
    'horse_training',
    'polo',
    'beekeeping',
    'backyard_chickens',
    'coin_collecting',
    'stamp_collecting',
    'postcard_collecting',
    'antiques',
    'vintage_items',
    'art_collecting',
    'vinyl_records',
    'cd_collecting',
    'cassette_tapes',
    'comic_books',
    'action_figures',
    'toy_collecting',
    'diecast_cars',
    'trading_cards',
    'sports_cards',
    'pokemon_cards',
    'magic_cards',
    'book_collecting',
    'rare_books',
    'first_editions',
    'autograph_collecting',
    'memorabilia',
    'sneaker_collecting',
    'watch_collecting',
    'knife_collecting',
    'pen_collecting',
    'fountain_pens',
    'military_memorabilia',
    'rock_collecting',
    'shell_collecting',
    'insect_collecting',
    'butterfly_collecting',
    'video_games',
    'pc_gaming',
    'console_gaming',
    'retro_gaming',
    'speedrunning',
    'game_streaming',
    'esports',
    'board_games',
    'tabletop_gaming',
    'dungeons_and_dragons',
    'warhammer',
    'miniature_wargaming',
    'card_games',
    'magic_the_gathering',
    'poker',
    'bridge',
    'chess',
    'go',
    'checkers',
    'backgammon',
    'puzzles',
    'jigsaw_puzzles',
    'rubiks_cube',
    'speedcubing',
    'sudoku',
    'crossword_puzzles',
    'escape_rooms',
    'laser_tag',
    'paintball',
    'airsoft',
    'cosplay',
    'costume_making',
    'prop_making',
    'cooking',
    'gourmet_cooking',
    'baking',
    'bread_baking',
    'cake_decorating',
    'pastry_making',
    'chocolate_making',
    'candy_making',
    'grilling',
    'smoking_meat',
    'bbq',
    'pizza_making',
    'pasta_making',
    'sushi_making',
    'cheese_making',
    'fermentation',
    'pickling',
    'canning',
    'preserving',
    'wine_making',
    'wine_tasting',
    'sommelier',
    'beer_brewing',
    'homebrewing',
    'beer_tasting',
    'cider_making',
    'mead_making',
    'distilling',
    'coffee_roasting',
    'coffee_tasting',
    'latte_art',
    'tea_tasting',
    'tea_ceremony',
    'mixology',
    'cocktail_making',
    'molecular_gastronomy',
    'food_photography',
    'reading',
    'speed_reading',
    'book_clubs',
    'language_learning',
    'linguistics',
    'history',
    'genealogy',
    'family_history',
    'philosophy',
    'theology',
    'science',
    'physics',
    'chemistry',
    'biology',
    'mathematics',
    'psychology',
    'sociology',
    'anthropology',
    'archaeology',
    'paleontology',
    'podcasts',
    'podcast_production',
    'audiobooks',
    'online_courses',
    'moocs',
    'tutoring',
    'teaching',
    'traveling',
    'road_trips',
    'vanlife',
    'rv_travel',
    'cruises',
    'cultural_exploration',
    'urban_exploration',
    'abandoned_places',
    'historical_sites',
    'museums',
    'volunteering',
    'humanitarian_work',
    'sustainable_living',
    'minimalism',
    'tiny_houses',
    'meditation',
    'mindfulness',
    'breathwork',
    'spiritual_practices',
    'astrology',
    'tarot',
    'palm_reading',
    'numerology',
    'ancestry_research',
    'auto_restoration',
    'classic_cars',
    'car_detailing',
    'motorcycle_riding',
    'motorcycle_restoration',
    'home_improvement',
    'diy_projects',
    'interior_design',
    'home_decor',
    'feng_shui',
    'fashion',
    'fashion_design',
    'upcycling_clothes',
    'thrifting',
    'vintage_fashion',
    'makeup_artistry',
    'special_effects_makeup',
    'nail_art',
    'hair_styling',
    'barbering',
    'tattooing',
    'body_art',
    'piercing',
    'lockpicking',
    'locksmith',
    'knife_making',
    'bladesmithing',
    'gunsmithing',
    'reloading',
    'target_shooting',
    'competitive_shooting',
    'traphooting'
);


--
-- Name: pet_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pet_type AS ENUM (
    'dog_mixed_breed',
    'labrador_retriever',
    'golden_retriever',
    'german_shepherd',
    'french_bulldog',
    'bulldog',
    'english_bulldog',
    'american_bulldog',
    'poodle',
    'toy_poodle',
    'miniature_poodle',
    'standard_poodle',
    'beagle',
    'rottweiler',
    'german_shorthaired_pointer',
    'yorkshire_terrier',
    'dachshund',
    'boxer',
    'siberian_husky',
    'alaskan_malamute',
    'great_dane',
    'doberman_pinscher',
    'australian_shepherd',
    'miniature_schnauzer',
    'pembroke_welsh_corgi',
    'cardigan_welsh_corgi',
    'cavalier_king_charles_spaniel',
    'shih_tzu',
    'boston_terrier',
    'pomeranian',
    'shetland_sheepdog',
    'brittany',
    'mastiff',
    'english_mastiff',
    'bull_mastiff',
    'cane_corso',
    'english_springer_spaniel',
    'cocker_spaniel',
    'border_collie',
    'chihuahua',
    'bernese_mountain_dog',
    'pug',
    'english_cocker_spaniel',
    'vizsla',
    'weimaraner',
    'basset_hound',
    'newfoundland',
    'rhodesian_ridgeback',
    'shiba_inu',
    'akita',
    'bloodhound',
    'dalmatian',
    'bullterrier',
    'staffordshire_bull_terrier',
    'american_staffordshire_terrier',
    'pitbull',
    'american_pit_bull_terrier',
    'bichon_frise',
    'maltese',
    'havanese',
    'papillon',
    'great_pyrenees',
    'saint_bernard',
    'samoyed',
    'chow_chow',
    'collie',
    'rough_collie',
    'smooth_collie',
    'old_english_sheepdog',
    'west_highland_white_terrier',
    'scottish_terrier',
    'cairn_terrier',
    'jack_russell_terrier',
    'rat_terrier',
    'fox_terrier',
    'airedale_terrier',
    'irish_setter',
    'gordon_setter',
    'english_setter',
    'pointer',
    'chesapeake_bay_retriever',
    'flat_coated_retriever',
    'curly_coated_retriever',
    'irish_wolfhound',
    'scottish_deerhound',
    'greyhound',
    'italian_greyhound',
    'whippet',
    'afghan_hound',
    'saluki',
    'borzoi',
    'basenji',
    'pharaoh_hound',
    'ibizan_hound',
    'american_eskimo_dog',
    'finnish_spitz',
    'keeshond',
    'norwegian_elkhound',
    'chinese_shar_pei',
    'lhasa_apso',
    'tibetan_terrier',
    'tibetan_mastiff',
    'leonberger',
    'kuvasz',
    'komondor',
    'bouvier_des_flandres',
    'belgian_malinois',
    'belgian_tervuren',
    'belgian_sheepdog',
    'anatolian_shepherd',
    'australian_cattle_dog',
    'border_terrier',
    'norwich_terrier',
    'norfolk_terrier',
    'bedlington_terrier',
    'manchester_terrier',
    'miniature_pinscher',
    'australian_terrier',
    'silky_terrier',
    'affenpinscher',
    'brussels_griffon',
    'schipperke',
    'pekingese',
    'japanese_chin',
    'toy_fox_terrier',
    'chinese_crested',
    'xoloitzcuintli',
    'peruvian_inca_orchid',
    'catahoula_leopard_dog',
    'plott_hound',
    'redbone_coonhound',
    'bluetick_coonhound',
    'black_and_tan_coonhound',
    'treeing_walker_coonhound',
    'cat_mixed_breed',
    'domestic_shorthair',
    'domestic_longhair',
    'persian_cat',
    'maine_coon',
    'siamese_cat',
    'ragdoll_cat',
    'bengal_cat',
    'british_shorthair',
    'scottish_fold',
    'american_shorthair',
    'abyssinian_cat',
    'sphynx_cat',
    'russian_blue',
    'oriental_shorthair',
    'devon_rex',
    'cornish_rex',
    'birman',
    'burmese_cat',
    'norwegian_forest_cat',
    'siberian_cat',
    'himalayan_cat',
    'exotic_shorthair',
    'ragamuffin',
    'turkish_angora',
    'turkish_van',
    'manx',
    'japanese_bobtail',
    'american_bobtail',
    'american_curl',
    'egyptian_mau',
    'ocicat',
    'savannah_cat',
    'toyger',
    'munchkin_cat',
    'selkirk_rex',
    'laperm',
    'somali_cat',
    'singapura',
    'tonkinese',
    'snowshoe_cat',
    'balinese_cat',
    'javanese_cat',
    'korat',
    'chartreux',
    'nebelung',
    'bombay_cat',
    'havana_brown',
    'chausie',
    'pixie_bob',
    'kurilian_bobtail',
    'peterbald',
    'donskoy',
    'lykoi',
    'khao_manee',
    'raas_cat',
    'sokoke',
    'cyprus_cat',
    'aegean_cat',
    'german_rex',
    'ural_rex',
    'parakeet',
    'budgie',
    'budgerigar',
    'cockatiel',
    'cockatoo',
    'umbrella_cockatoo',
    'moluccan_cockatoo',
    'goffins_cockatoo',
    'african_grey_parrot',
    'congo_african_grey',
    'timneh_african_grey',
    'macaw',
    'blue_and_gold_macaw',
    'scarlet_macaw',
    'green_winged_macaw',
    'hyacinth_macaw',
    'amazon_parrot',
    'blue_fronted_amazon',
    'yellow_naped_amazon',
    'double_yellow_headed_amazon',
    'conure',
    'sun_conure',
    'green_cheek_conure',
    'jenday_conure',
    'nanday_conure',
    'lovebird',
    'fischers_lovebird',
    'peach_faced_lovebird',
    'canary',
    'finch',
    'zebra_finch',
    'society_finch',
    'gouldian_finch',
    'java_sparrow',
    'dove',
    'diamond_dove',
    'ring_necked_dove',
    'pigeon',
    'racing_pigeon',
    'fancy_pigeon',
    'quaker_parrot',
    'monk_parakeet',
    'eclectus_parrot',
    'pionus_parrot',
    'caique',
    'lorikeet',
    'rosella',
    'bourkes_parakeet',
    'lineolated_parakeet',
    'parrotlet',
    'senegal_parrot',
    'meyers_parrot',
    'rabbit',
    'holland_lop',
    'netherland_dwarf',
    'mini_rex',
    'flemish_giant',
    'lionhead_rabbit',
    'angora_rabbit',
    'dutch_rabbit',
    'english_lop',
    'hamster',
    'syrian_hamster',
    'dwarf_hamster',
    'roborovski_hamster',
    'guinea_pig',
    'american_guinea_pig',
    'peruvian_guinea_pig',
    'abyssinian_guinea_pig',
    'ferret',
    'gerbil',
    'chinchilla',
    'hedgehog',
    'african_pygmy_hedgehog',
    'mouse',
    'fancy_mouse',
    'rat',
    'fancy_rat',
    'dumbo_rat',
    'sugar_glider',
    'degu',
    'prairie_dog',
    'ball_python',
    'corn_snake',
    'king_snake',
    'california_kingsnake',
    'milk_snake',
    'boa_constrictor',
    'red_tail_boa',
    'rainbow_boa',
    'blood_python',
    'carpet_python',
    'green_tree_python',
    'burmese_python',
    'reticulated_python',
    'garter_snake',
    'hognose_snake',
    'bearded_dragon',
    'leopard_gecko',
    'crested_gecko',
    'gargoyle_gecko',
    'tokay_gecko',
    'african_fat_tailed_gecko',
    'blue_tongue_skink',
    'uromastyx',
    'monitor_lizard',
    'savannah_monitor',
    'tegu',
    'argentine_tegu',
    'iguana',
    'green_iguana',
    'chameleon',
    'veiled_chameleon',
    'panther_chameleon',
    'jacksons_chameleon',
    'anole',
    'green_anole',
    'turtle',
    'red_eared_slider',
    'painted_turtle',
    'map_turtle',
    'musk_turtle',
    'box_turtle',
    'tortoise',
    'russian_tortoise',
    'hermann_tortoise',
    'sulcata_tortoise',
    'leopard_tortoise',
    'goldfish',
    'betta_fish',
    'siamese_fighting_fish',
    'guppy',
    'molly',
    'platy',
    'swordtail',
    'tetra',
    'neon_tetra',
    'cardinal_tetra',
    'angelfish',
    'discus',
    'oscar',
    'cichlid',
    'african_cichlid',
    'apistogramma',
    'ram_cichlid',
    'barb',
    'tiger_barb',
    'cherry_barb',
    'danio',
    'zebra_danio',
    'corydoras',
    'pleco',
    'bristlenose_pleco',
    'clownfish',
    'tang',
    'damselfish',
    'goby',
    'axolotl',
    'frog',
    'tree_frog',
    'red_eyed_tree_frog',
    'whites_tree_frog',
    'pacman_frog',
    'dart_frog',
    'poison_dart_frog',
    'fire_bellied_toad',
    'african_clawed_frog',
    'salamander',
    'fire_salamander',
    'newt',
    'horse',
    'quarter_horse',
    'thoroughbred',
    'arabian_horse',
    'appaloosa',
    'paint_horse',
    'morgan_horse',
    'tennessee_walker',
    'standardbred',
    'miniature_horse',
    'pony',
    'shetland_pony',
    'welsh_pony',
    'donkey',
    'miniature_donkey',
    'mule',
    'goat',
    'nigerian_dwarf_goat',
    'pygmy_goat',
    'nubian_goat',
    'alpine_goat',
    'boer_goat',
    'sheep',
    'suffolk_sheep',
    'merino_sheep',
    'dorset_sheep',
    'chicken',
    'rhode_island_red',
    'plymouth_rock',
    'leghorn',
    'orpington',
    'wyandotte',
    'silkie',
    'bantam',
    'duck',
    'pekin_duck',
    'mallard',
    'muscovy_duck',
    'khaki_campbell',
    'rouen_duck',
    'pig',
    'pot_bellied_pig',
    'kunekune_pig',
    'cow',
    'jersey_cow',
    'holstein',
    'angus',
    'llama',
    'alpaca',
    'tarantula',
    'rose_hair_tarantula',
    'mexican_redknee_tarantula',
    'chilean_rose_tarantula',
    'scorpion',
    'emperor_scorpion',
    'hermit_crab',
    'land_hermit_crab',
    'stick_insect',
    'praying_mantis',
    'hissing_cockroach',
    'millipede',
    'african_giant_millipede'
);


--
-- Name: skill_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.skill_type AS ENUM (
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
    'objective_c',
    'kotlin',
    'go',
    'rust',
    'scala',
    'r',
    'matlab',
    'julia',
    'perl',
    'lua',
    'haskell',
    'elixir',
    'erlang',
    'clojure',
    'f_sharp',
    'dart',
    'sql',
    'plsql',
    'tsql',
    'nosql',
    'html',
    'css',
    'sass',
    'less',
    'html_css',
    'xml',
    'json',
    'yaml',
    'graphql',
    'assembly',
    'vb_net',
    'fortran',
    'cobol',
    'groovy',
    'powershell',
    'bash',
    'shell_scripting',
    'react',
    'react_native',
    'vue',
    'vuejs',
    'angular',
    'angularjs',
    'svelte',
    'ember',
    'backbone',
    'jquery',
    'webpack',
    'vite',
    'parcel',
    'gulp',
    'grunt',
    'babel',
    'next_js',
    'nuxt',
    'gatsby',
    'redux',
    'mobx',
    'vuex',
    'pinia',
    'rxjs',
    'axios',
    'fetch_api',
    'websockets',
    'webrtc',
    'pwa',
    'service_workers',
    'web_components',
    'material_ui',
    'ant_design',
    'tailwind_css',
    'bootstrap',
    'foundation',
    'bulma',
    'chakra_ui',
    'semantic_ui',
    'responsive_design',
    'mobile_first_design',
    'accessibility',
    'wcag',
    'seo',
    'web_performance',
    'lighthouse',
    'nodejs',
    'express',
    'nestjs',
    'koa',
    'fastify',
    'django',
    'flask',
    'fastapi',
    'pyramid',
    'tornado',
    'spring',
    'spring_boot',
    'hibernate',
    'asp_net',
    'asp_net_core',
    'laravel',
    'symfony',
    'codeigniter',
    'rails',
    'ruby_on_rails',
    'sinatra',
    'phoenix',
    'gin',
    'echo',
    'fiber',
    'actix',
    'rocket',
    'wordpress',
    'drupal',
    'joomla',
    'shopify',
    'magento',
    'woocommerce',
    'strapi',
    'contentful',
    'sanity',
    'rest_api',
    'graphql_api',
    'grpc',
    'soap',
    'microservices',
    'serverless',
    'lambda',
    'api_gateway',
    'ios_development',
    'android_development',
    'flutter',
    'xamarin',
    'ionic',
    'cordova',
    'phonegap',
    'swiftui',
    'jetpack_compose',
    'nativescript',
    'postgresql',
    'mysql',
    'mariadb',
    'sqlite',
    'mongodb',
    'redis',
    'elasticsearch',
    'cassandra',
    'dynamodb',
    'couchdb',
    'neo4j',
    'graph_databases',
    'oracle',
    'sql_server',
    'db2',
    'firestore',
    'realm',
    'indexeddb',
    'database_design',
    'database_optimization',
    'query_optimization',
    'etl',
    'data_warehousing',
    'data_lakes',
    'snowflake',
    'bigquery',
    'redshift',
    'aws',
    'ec2',
    's3',
    'aws_lambda',
    'cloudformation',
    'aws_cdk',
    'azure',
    'azure_devops',
    'google_cloud',
    'gcp',
    'digitalocean',
    'linode',
    'heroku',
    'netlify',
    'vercel',
    'cloudflare',
    'docker',
    'docker_compose',
    'kubernetes',
    'k8s',
    'helm',
    'openshift',
    'jenkins',
    'gitlab_ci',
    'github_actions',
    'circle_ci',
    'travis_ci',
    'bamboo',
    'teamcity',
    'git',
    'github',
    'gitlab',
    'bitbucket',
    'svn',
    'mercurial',
    'ci_cd',
    'terraform',
    'ansible',
    'puppet',
    'chef',
    'saltstack',
    'vagrant',
    'packer',
    'consul',
    'vault',
    'prometheus',
    'grafana',
    'elk_stack',
    'splunk',
    'datadog',
    'new_relic',
    'monitoring',
    'logging',
    'infrastructure_as_code',
    'gitops',
    'argocd',
    'flux',
    'machine_learning',
    'deep_learning',
    'neural_networks',
    'cnn',
    'rnn',
    'lstm',
    'gru',
    'transformers',
    'bert',
    'gpt',
    'data_analysis',
    'data_visualization',
    'data_mining',
    'statistics',
    'probability',
    'linear_algebra',
    'calculus',
    'nlp',
    'natural_language_processing',
    'computer_vision',
    'image_recognition',
    'object_detection',
    'tensorflow',
    'pytorch',
    'keras',
    'scikit_learn',
    'pandas',
    'numpy',
    'matplotlib',
    'seaborn',
    'plotly',
    'tableau',
    'power_bi',
    'r_programming',
    'jupyter',
    'apache_spark',
    'hadoop',
    'hive',
    'pig',
    'reinforcement_learning',
    'supervised_learning',
    'unsupervised_learning',
    'semi_supervised_learning',
    'time_series_analysis',
    'forecasting',
    'anomaly_detection',
    'recommendation_systems',
    'ab_testing',
    'experiment_design',
    'causal_inference',
    'ui_design',
    'ux_design',
    'ui_ux_design',
    'user_research',
    'usability_testing',
    'wireframing',
    'prototyping',
    'user_personas',
    'user_journey_mapping',
    'information_architecture',
    'interaction_design',
    'motion_design',
    'graphic_design',
    'brand_design',
    'logo_design',
    'web_design',
    'mobile_design',
    'print_design',
    'packaging_design',
    'typography',
    'color_theory',
    'photoshop',
    'illustrator',
    'indesign',
    'after_effects',
    'premiere_pro',
    'figma',
    'sketch',
    'adobe_xd',
    'invision',
    'framer',
    '3d_modeling',
    'blender',
    'maya',
    '3ds_max',
    'cinema_4d',
    'zbrush',
    'substance_painter',
    'unity',
    'unreal_engine',
    'animation',
    'character_animation',
    'rigging',
    'video_editing',
    'sound_design',
    'audio_engineering',
    'project_management',
    'program_management',
    'portfolio_management',
    'agile',
    'scrum',
    'kanban',
    'lean',
    'six_sigma',
    'prince2',
    'pmp',
    'waterfall',
    'product_management',
    'product_development',
    'roadmapping',
    'prioritization',
    'stakeholder_management',
    'business_analysis',
    'requirements_gathering',
    'process_improvement',
    'change_management',
    'risk_management',
    'budget_management',
    'resource_planning',
    'marketing',
    'digital_marketing',
    'content_marketing',
    'inbound_marketing',
    'outbound_marketing',
    'email_marketing',
    'marketing_automation',
    'sem',
    'ppc',
    'google_ads',
    'facebook_ads',
    'social_media_marketing',
    'influencer_marketing',
    'affiliate_marketing',
    'growth_marketing',
    'growth_hacking',
    'conversion_optimization',
    'analytics',
    'google_analytics',
    'tag_manager',
    'brand_management',
    'brand_strategy',
    'public_relations',
    'crisis_management',
    'sales',
    'b2b_sales',
    'b2c_sales',
    'enterprise_sales',
    'inside_sales',
    'outside_sales',
    'account_management',
    'customer_success',
    'customer_service',
    'customer_support',
    'technical_support',
    'help_desk',
    'crm',
    'salesforce',
    'hubspot',
    'zoho',
    'pipedrive',
    'leadership',
    'team_management',
    'people_management',
    'coaching',
    'mentoring',
    'conflict_resolution',
    'negotiation',
    'strategic_thinking',
    'strategic_planning',
    'business_development',
    'partnership_development',
    'fundraising',
    'investor_relations',
    'venture_capital',
    'entrepreneurship',
    'public_speaking',
    'presentation_skills',
    'storytelling',
    'technical_writing',
    'documentation',
    'copywriting',
    'content_writing',
    'editing',
    'proofreading',
    'translation',
    'interpretation',
    'active_listening',
    'empathy',
    'emotional_intelligence',
    'photography',
    'portrait_photography',
    'landscape_photography',
    'product_photography',
    'food_photography',
    'videography',
    'video_production',
    'music_production',
    'audio_production',
    'sound_engineering',
    'mixing',
    'mastering',
    'songwriting',
    'composition',
    'arranging',
    'conducting',
    'writing',
    'creative_writing',
    'journalism',
    'blogging',
    'podcasting',
    'mechanical_engineering',
    'electrical_engineering',
    'civil_engineering',
    'chemical_engineering',
    'aerospace_engineering',
    'biomedical_engineering',
    'industrial_engineering',
    'systems_engineering',
    'robotics',
    'automation',
    'plc_programming',
    'scada',
    'hmi',
    'cad',
    'autocad',
    'solidworks',
    'catia',
    'inventor',
    'fusion_360',
    'creo',
    'revit',
    'bim',
    'fem_analysis',
    'cfd',
    'matlab_simulink',
    'labview',
    'accounting',
    'bookkeeping',
    'financial_accounting',
    'management_accounting',
    'cost_accounting',
    'tax_accounting',
    'auditing',
    'internal_audit',
    'external_audit',
    'financial_analysis',
    'financial_modeling',
    'valuation',
    'investment_analysis',
    'risk_analysis',
    'financial_planning',
    'budgeting',
    'excel',
    'advanced_excel',
    'vba',
    'power_query',
    'power_pivot',
    'quickbooks',
    'xero',
    'sage',
    'sap',
    'oracle_financials',
    'netsuite',
    'bloomberg_terminal',
    'eikon',
    'trading',
    'forex',
    'stocks',
    'options',
    'futures',
    'derivatives',
    'crypto_trading',
    'english',
    'spanish',
    'french',
    'german',
    'italian',
    'portuguese',
    'russian',
    'chinese',
    'mandarin',
    'cantonese',
    'japanese',
    'korean',
    'arabic',
    'hindi',
    'bengali',
    'urdu',
    'turkish',
    'dutch',
    'polish',
    'swedish',
    'norwegian',
    'danish',
    'finnish',
    'greek',
    'hebrew',
    'thai',
    'vietnamese',
    'indonesian',
    'malay',
    'tagalog',
    'swahili',
    'teaching',
    'curriculum_development',
    'instructional_design',
    'e_learning',
    'lms',
    'research',
    'academic_research',
    'market_research',
    'qualitative_research',
    'quantitative_research',
    'survey_design',
    'troubleshooting',
    'debugging',
    'problem_solving',
    'critical_thinking',
    'analytical_thinking',
    'attention_to_detail',
    'time_management',
    'organization',
    'multitasking',
    'adaptability',
    'flexibility',
    'creativity',
    'innovation',
    'collaboration',
    'teamwork',
    'cross_functional_collaboration',
    'remote_work',
    'data_entry',
    'typing',
    'transcription',
    'virtual_assistance',
    'administrative_support',
    'office_management',
    'event_planning',
    'event_coordination',
    'supply_chain_management',
    'logistics',
    'procurement',
    'inventory_management',
    'quality_assurance',
    'quality_control',
    'iso_standards',
    'lean_manufacturing',
    'continuous_improvement',
    'kaizen'
);


--
-- Name: batch_notification(integer, character varying, character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.batch_notification(p_user_id integer, p_type character varying, p_entity_type character varying, p_entity_id integer, p_actor_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    batch_id INTEGER;
    current_count INTEGER;
    current_actors INTEGER[];
BEGIN
    -- Try to find existing batch
    SELECT id, count, sample_actor_ids INTO batch_id, current_count, current_actors
    FROM notification_batches
    WHERE user_id = p_user_id
      AND type = p_type
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id;

    IF batch_id IS NOT NULL THEN
        -- Update existing batch
        UPDATE notification_batches
        SET count = count + 1,
            last_actor_id = p_actor_id,
            sample_actor_ids = array_append(
                CASE
                    WHEN array_length(sample_actor_ids, 1) >= 5
                    THEN sample_actor_ids[2:5]
                    ELSE sample_actor_ids
                END,
                p_actor_id
            ),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = batch_id;
    ELSE
        -- Create new batch
        INSERT INTO notification_batches (
            user_id, type, entity_type, entity_id,
            count, last_actor_id, sample_actor_ids
        )
        VALUES (
            p_user_id, p_type, p_entity_type, p_entity_id,
            1, p_actor_id, ARRAY[p_actor_id]
        )
        RETURNING id INTO batch_id;
    END IF;

    RETURN batch_id;
END;
$$;


--
-- Name: calculate_distance_miles(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
    R DECIMAL := 3959; -- Earth's radius in miles
    dLat DECIMAL;
    dLon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    -- Convert degrees to radians
    dLat := RADIANS(lat2 - lat1);
    dLon := RADIANS(lon2 - lon1);

    -- Haversine formula
    a := SIN(dLat / 2) * SIN(dLat / 2) +
         COS(RADIANS(lat1)) * COS(RADIANS(lat2)) *
         SIN(dLon / 2) * SIN(dLon / 2);
    c := 2 * ATAN2(SQRT(a), SQRT(1 - a));

    RETURN (R * c)::DECIMAL(10, 2);
END;
$$;


--
-- Name: FUNCTION calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_distance_miles(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric) IS 'Calculate distance between two lat/lon points in miles using Haversine formula';


--
-- Name: calculate_engagement_score(integer, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_engagement_score(reply_count integer, reaction_count integer, deep_read_count integer, view_count integer) RETURNS double precision
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF view_count = 0 THEN
    RETURN 0;
  END IF;

  -- Engagement score based on interaction ratios
  RETURN (
    (reply_count * 10.0) +
    (reaction_count * 5.0) +
    (deep_read_count * 2.0)
  ) / view_count::FLOAT * 100;
END;
$$;


--
-- Name: FUNCTION calculate_engagement_score(reply_count integer, reaction_count integer, deep_read_count integer, view_count integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_engagement_score(reply_count integer, reaction_count integer, deep_read_count integer, view_count integer) IS 'Calculate engagement score based on interaction quality vs view count';


--
-- Name: calculate_interaction_rate(integer, timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_interaction_rate(total_interactions integer, created_at timestamp without time zone) RETURNS double precision
    LANGUAGE plpgsql
    AS $$
DECLARE
  hours_since_creation FLOAT;
BEGIN
  hours_since_creation := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600;
  IF hours_since_creation <= 0 THEN
    RETURN 0;
  END IF;
  RETURN total_interactions::FLOAT / hours_since_creation;
END;
$$;


--
-- Name: FUNCTION calculate_interaction_rate(total_interactions integer, created_at timestamp without time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_interaction_rate(total_interactions integer, created_at timestamp without time zone) IS 'Calculate interaction rate (interactions per hour since creation)';


--
-- Name: calculate_recency_score(timestamp without time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_recency_score(comment_created_at timestamp without time zone) RETURNS double precision
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Higher score for newer comments (max 100, decays over 30 days)
  RETURN GREATEST(0, 100 - EXTRACT(EPOCH FROM (NOW() - comment_created_at)) / 86400 / 30 * 100);
END;
$$;


--
-- Name: FUNCTION calculate_recency_score(comment_created_at timestamp without time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calculate_recency_score(comment_created_at timestamp without time zone) IS 'Calculate recency score (0-100) based on comment age, decays over 30 days';


--
-- Name: calculate_reputation_score(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calculate_reputation_score(p_user_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_score INTEGER := 0;
    v_avg_rating DECIMAL(3,2);
    v_total_ratings INTEGER;
    v_quality_posts INTEGER;
    v_quality_comments INTEGER;
    v_helpful INTEGER;
    v_verified INTEGER;
    v_reported INTEGER;
    v_level VARCHAR(20);
BEGIN
    -- Get reputation data
    SELECT
        COALESCE(average_rating, 0),
        COALESCE(total_ratings_received, 0),
        COALESCE(verified_ratings_count, 0),
        COALESCE(helpful_count, 0),
        COALESCE(reported_count, 0),
        COALESCE(quality_posts_count, 0),
        COALESCE(quality_comments_count, 0)
    INTO
        v_avg_rating,
        v_total_ratings,
        v_verified,
        v_helpful,
        v_reported,
        v_quality_posts,
        v_quality_comments
    FROM user_reputation
    WHERE user_id = p_user_id;

    -- If no reputation record, return 0
    IF v_avg_rating IS NULL THEN
        RETURN 0;
    END IF;

    -- Base score from average rating (max 500)
    v_score := v_score + (v_avg_rating * 100)::INTEGER;

    -- Volume bonus (max 100)
    v_score := v_score + LEAST(v_total_ratings * 2, 100);

    -- Quality content bonus (max 250)
    v_score := v_score + LEAST(v_quality_posts * 5, 150);
    v_score := v_score + LEAST(v_quality_comments * 3, 100);

    -- Helpful bonus (max 100)
    v_score := v_score + LEAST(v_helpful * 2, 100);

    -- Verified bonus (max 50)
    v_score := v_score + LEAST(v_verified * 3, 50);

    -- Penalties
    v_score := v_score - (v_reported * 10);

    -- Clamp to 0-1000
    v_score := GREATEST(0, LEAST(1000, v_score));

    -- Determine level
    IF v_score >= 850 THEN v_level := 'legend';
    ELSIF v_score >= 700 THEN v_level := 'expert';
    ELSIF v_score >= 500 THEN v_level := 'veteran';
    ELSIF v_score >= 300 THEN v_level := 'contributor';
    ELSIF v_score >= 100 THEN v_level := 'member';
    ELSE v_level := 'newcomer';
    END IF;

    -- Update reputation
    UPDATE user_reputation
    SET
        reputation_score = v_score,
        reputation_level = v_level,
        reputation_peak = GREATEST(COALESCE(reputation_peak, 0), v_score),
        reputation_peak_at = CASE
            WHEN v_score > COALESCE(reputation_peak, 0) THEN CURRENT_TIMESTAMP
            ELSE reputation_peak_at
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id;

    RETURN v_score;
END;
$$;


--
-- Name: cleanup_expired_typing_indicators(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_expired_typing_indicators() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM typing_indicators WHERE expires_at < CURRENT_TIMESTAMP;
END;
$$;


--
-- Name: cleanup_nearby_search_cache(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_nearby_search_cache() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM nearby_search_cache
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


--
-- Name: FUNCTION cleanup_nearby_search_cache(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.cleanup_nearby_search_cache() IS 'Remove expired cache entries, returns count deleted';


--
-- Name: cleanup_old_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_old_notifications() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete read notifications older than 90 days
    DELETE FROM notifications
    WHERE read_at IS NOT NULL
      AND read_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete expired notifications
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP;

    RETURN deleted_count;
END;
$$;


--
-- Name: create_default_notification_preferences(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_notification_preferences() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Social notifications
    INSERT INTO notification_preferences (user_id, notification_type, email_enabled, push_enabled, in_app_enabled)
    VALUES
        (NEW.id, 'follow', TRUE, TRUE, TRUE),
        (NEW.id, 'reaction', TRUE, TRUE, TRUE),
        (NEW.id, 'comment', TRUE, TRUE, TRUE),
        (NEW.id, 'reply', TRUE, TRUE, TRUE),
        (NEW.id, 'mention', TRUE, TRUE, TRUE),
        (NEW.id, 'share', TRUE, TRUE, TRUE),
        -- Group notifications
        (NEW.id, 'group_invite', TRUE, TRUE, TRUE),
        (NEW.id, 'group_join_request', TRUE, TRUE, TRUE),
        (NEW.id, 'group_post', FALSE, FALSE, TRUE), -- disabled by default
        (NEW.id, 'group_role_change', TRUE, TRUE, TRUE),
        -- Messaging notifications
        (NEW.id, 'new_message', TRUE, TRUE, TRUE),
        (NEW.id, 'conversation_add', TRUE, TRUE, TRUE),
        -- System notifications
        (NEW.id, 'security_alert', TRUE, TRUE, TRUE),
        (NEW.id, 'system_announcement', FALSE, TRUE, TRUE)
    ON CONFLICT (user_id, notification_type) DO NOTHING;

    RETURN NEW;
END;
$$;


--
-- Name: create_direct_conversation(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_direct_conversation(p_user1_id integer, p_user2_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    existing_conv_id INTEGER;
    new_conv_id INTEGER;
BEGIN
    -- Check if direct conversation already exists
    SELECT c.id INTO existing_conv_id
    FROM conversations c
    INNER JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
    INNER JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.type = 'direct'
      AND cp1.user_id = p_user1_id AND cp1.left_at IS NULL
      AND cp2.user_id = p_user2_id AND cp2.left_at IS NULL
      AND (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = c.id AND left_at IS NULL) = 2;

    IF existing_conv_id IS NOT NULL THEN
        RETURN existing_conv_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (type, created_by)
    VALUES ('direct', p_user1_id)
    RETURNING id INTO new_conv_id;

    -- Add both participants
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES
        (new_conv_id, p_user1_id, 'member'),
        (new_conv_id, p_user2_id, 'member');

    RETURN new_conv_id;
END;
$$;


--
-- Name: create_notification(integer, character varying, character varying, text, integer, character varying, integer, character varying, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_notification(p_user_id integer, p_type character varying, p_title character varying, p_message text, p_actor_id integer DEFAULT NULL::integer, p_entity_type character varying DEFAULT NULL::character varying, p_entity_id integer DEFAULT NULL::integer, p_action_url character varying DEFAULT NULL::character varying, p_priority character varying DEFAULT 'normal'::character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    notification_id INTEGER;
    pref_enabled BOOLEAN;
BEGIN
    -- Check if user has this notification type enabled
    SELECT in_app_enabled INTO pref_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id AND notification_type = p_type;

    -- If preference not found or disabled, don't create notification
    IF pref_enabled IS FALSE THEN
        RETURN NULL;
    END IF;

    -- Don't notify users about their own actions
    IF p_actor_id = p_user_id THEN
        RETURN NULL;
    END IF;

    -- Create the notification
    INSERT INTO notifications (
        user_id, type, title, message, actor_id,
        entity_type, entity_id, action_url, priority
    )
    VALUES (
        p_user_id, p_type, p_title, p_message, p_actor_id,
        p_entity_type, p_entity_id, p_action_url, p_priority
    )
    RETURNING id INTO notification_id;

    RETURN notification_id;
END;
$$;


--
-- Name: find_nearby_users(integer, numeric, numeric, integer, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer DEFAULT 25, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0) RETURNS TABLE(user_id integer, username character varying, first_name character varying, last_name character varying, avatar_url character varying, distance_miles numeric, location_city character varying, location_state character varying, location_sharing character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        u.avatar_url,
        calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) as distance_miles,
        u.location_city,
        u.location_state,
        u.location_sharing
    FROM users u
    WHERE
        u.id != p_user_id -- Exclude the searching user
        AND u.location_latitude IS NOT NULL
        AND u.location_longitude IS NOT NULL
        AND u.location_sharing != 'off'
        AND u.is_active = TRUE
        -- Rough bounding box filter for performance (before calculating exact distance)
        -- 1 degree latitude ≈ 69 miles, 1 degree longitude varies but ~69 miles at equator
        AND u.location_latitude BETWEEN p_lat - (p_radius_miles / 69.0) AND p_lat + (p_radius_miles / 69.0)
        AND u.location_longitude BETWEEN p_lon - (p_radius_miles / 69.0) AND p_lon + (p_radius_miles / 69.0)
        AND calculate_distance_miles(p_lat, p_lon, u.location_latitude, u.location_longitude) <= p_radius_miles
    ORDER BY distance_miles
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


--
-- Name: FUNCTION find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer, p_limit integer, p_offset integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.find_nearby_users(p_user_id integer, p_lat numeric, p_lon numeric, p_radius_miles integer, p_limit integer, p_offset integer) IS 'Find users within specified radius (miles) sorted by distance';


--
-- Name: get_group_chat(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_chat(p_group_id integer, p_user_id integer) RETURNS TABLE(conversation_id integer, is_member boolean, chat_enabled boolean)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.conversation_id,
    EXISTS (
      SELECT 1 FROM group_memberships gm
      WHERE gm.group_id = p_group_id
        AND gm.user_id = p_user_id
        AND gm.status = 'active'
    ) as is_member,
    COALESCE((g.settings->>'chat_enabled')::boolean, false) as chat_enabled
  FROM groups g
  WHERE g.id = p_group_id;
END;
$$;


--
-- Name: get_group_user_role(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_group_user_role(p_user_id integer, p_group_id integer) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    user_role VARCHAR(20);
BEGIN
    SELECT role INTO user_role
    FROM group_memberships
    WHERE user_id = p_user_id
    AND group_id = p_group_id
    AND status = 'active';

    RETURN user_role;
END;
$$;


--
-- Name: get_unread_count(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_count(p_conversation_id integer, p_user_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    last_read TIMESTAMP;
    unread_count INTEGER;
BEGIN
    -- Get when user last read messages
    SELECT last_read_at INTO last_read
    FROM conversation_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id;

    -- Count messages after last read time
    SELECT COUNT(*) INTO unread_count
    FROM messages
    WHERE conversation_id = p_conversation_id
      AND sender_id != p_user_id
      AND deleted_at IS NULL
      AND (last_read IS NULL OR created_at > last_read);

    RETURN COALESCE(unread_count, 0);
END;
$$;


--
-- Name: get_unread_notification_count(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_unread_notification_count(p_user_id integer) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
      AND read_at IS NULL
      AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

    RETURN COALESCE(unread_count, 0);
END;
$$;


--
-- Name: get_user_location(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_location(p_user_id integer) RETURNS TABLE(latitude numeric, longitude numeric, address character varying, city character varying, state character varying, zip character varying, country character varying, accuracy integer, updated_at timestamp without time zone, sharing character varying)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.location_latitude,
        u.location_longitude,
        u.address,
        u.location_city,
        u.location_state,
        u.location_zip,
        u.location_country,
        u.location_accuracy,
        u.location_updated_at,
        u.location_sharing
    FROM users u
    WHERE u.id = p_user_id;
END;
$$;


--
-- Name: FUNCTION get_user_location(p_user_id integer); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_user_location(p_user_id integer) IS 'Get user''s current location including address with privacy settings';


--
-- Name: initialize_user_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.initialize_user_stats() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO user_stats (user_id, post_count, last_post_at)
    SELECT
        u.id,
        COUNT(p.id),
        MAX(p.created_at)
    FROM users u
    LEFT JOIN posts p ON u.id = p.user_id
    WHERE NOT EXISTS (SELECT 1 FROM user_stats WHERE user_id = u.id)
    GROUP BY u.id;
END;
$$;


--
-- Name: is_group_admin(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_group_admin(p_user_id integer, p_group_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
        AND role = 'admin'
    );
END;
$$;


--
-- Name: is_group_member(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_group_member(p_user_id integer, p_group_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
    );
END;
$$;


--
-- Name: is_group_moderator(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_group_moderator(p_user_id integer, p_group_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM group_memberships
        WHERE user_id = p_user_id
        AND group_id = p_group_id
        AND status = 'active'
        AND role IN ('moderator', 'admin')
    );
END;
$$;


--
-- Name: limit_location_history(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.limit_location_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Delete old entries beyond 100 for this user
    DELETE FROM location_history
    WHERE id IN (
        SELECT id
        FROM location_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 100
    );

    RETURN NEW;
END;
$$;


--
-- Name: mark_notifications_read(integer, integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_notifications_read(p_user_id integer, p_notification_ids integer[] DEFAULT NULL::integer[]) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all unread notifications as read
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id
          AND read_at IS NULL;
    ELSE
        -- Mark specific notifications as read
        UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP
        WHERE user_id = p_user_id
          AND id = ANY(p_notification_ids)
          AND read_at IS NULL;
    END IF;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;


--
-- Name: set_group_comment_path(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_group_comment_path() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    parent_path LTREE;
BEGIN
    IF NEW.parent_id IS NULL THEN
        -- Top-level comment
        NEW.path := text2ltree(NEW.id::text);
        NEW.depth := 0;
    ELSE
        -- Nested comment
        SELECT path, depth INTO parent_path, NEW.depth
        FROM group_comments
        WHERE id = NEW.parent_id;

        IF parent_path IS NULL THEN
            RAISE EXCEPTION 'Parent comment not found';
        END IF;

        NEW.path := parent_path || text2ltree(NEW.id::text);
        NEW.depth := NEW.depth + 1;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: sync_group_chat_on_join(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_group_chat_on_join() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_conversation_id INTEGER;
  v_chat_enabled BOOLEAN;
BEGIN
  -- Only process active members
  IF NEW.status = 'active' THEN
    -- Get group's conversation ID and chat enabled status
    SELECT
      conversation_id,
      COALESCE((settings->>'chat_enabled')::boolean, false)
    INTO v_conversation_id, v_chat_enabled
    FROM groups
    WHERE id = NEW.group_id;

    -- If group has chat enabled, add user to conversation
    IF v_conversation_id IS NOT NULL AND v_chat_enabled = true THEN
      INSERT INTO conversation_participants (conversation_id, user_id, role, joined_at)
      VALUES (v_conversation_id, NEW.user_id, 'member', CURRENT_TIMESTAMP)
      ON CONFLICT (conversation_id, user_id, left_at)
      WHERE left_at IS NULL
      DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_group_chat_on_leave(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_group_chat_on_leave() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_conversation_id INTEGER;
BEGIN
  -- Only process when member becomes inactive
  IF OLD.status = 'active' AND NEW.status != 'active' THEN
    -- Get group's conversation ID
    SELECT conversation_id INTO v_conversation_id
    FROM groups
    WHERE id = NEW.group_id;

    -- If group has a chat, mark participant as left
    IF v_conversation_id IS NOT NULL THEN
      UPDATE conversation_participants
      SET left_at = CURRENT_TIMESTAMP
      WHERE conversation_id = v_conversation_id
        AND user_id = NEW.user_id
        AND left_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: update_comment_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_comment_metrics() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Insert metrics record if it doesn't exist
  INSERT INTO comment_metrics (comment_id, first_interaction_at)
  VALUES (NEW.comment_id, NEW.created_at)
  ON CONFLICT (comment_id) DO NOTHING;

  -- Update aggregated counts and scores
  UPDATE comment_metrics SET
    view_count = view_count + CASE WHEN NEW.interaction_type = 'view' THEN 1 ELSE 0 END,
    reply_count = reply_count + CASE WHEN NEW.interaction_type = 'reply' THEN 1 ELSE 0 END,
    reaction_count = reaction_count + CASE WHEN NEW.interaction_type = 'reaction' THEN 1 ELSE 0 END,
    share_count = share_count + CASE WHEN NEW.interaction_type = 'share' THEN 1 ELSE 0 END,
    deep_read_count = deep_read_count + CASE WHEN NEW.interaction_type = 'deep_read' THEN 1 ELSE 0 END,
    total_interaction_count = total_interaction_count + 1,
    last_interaction_at = NEW.created_at,
    last_updated = NOW()
  WHERE comment_id = NEW.comment_id;

  -- Recalculate algorithm scores
  UPDATE comment_metrics cm SET
    recency_score = calculate_recency_score(c.created_at),
    interaction_rate = calculate_interaction_rate(cm.total_interaction_count, c.created_at),
    engagement_score = calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count),
    combined_algorithm_score = (
      calculate_recency_score(c.created_at) * 0.3 +
      calculate_interaction_rate(cm.total_interaction_count, c.created_at) * 0.4 +
      calculate_engagement_score(cm.reply_count, cm.reaction_count, cm.deep_read_count, cm.view_count) * 0.3
    )
  FROM comments c
  WHERE cm.comment_id = NEW.comment_id AND c.id = NEW.comment_id;

  RETURN NEW;
END;
$$;


--
-- Name: update_conversation_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_conversation_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE conversations
    SET updated_at = NEW.created_at,
        last_message_id = NEW.id
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$;


--
-- Name: update_follow_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_follow_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        -- Increment following count for follower
        INSERT INTO user_stats (user_id, following_count)
        VALUES (NEW.follower_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET following_count = user_stats.following_count + 1,
            updated_at = CURRENT_TIMESTAMP;

        -- Increment follower count for following
        INSERT INTO user_stats (user_id, follower_count)
        VALUES (NEW.following_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET follower_count = user_stats.follower_count + 1,
            updated_at = CURRENT_TIMESTAMP;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrement following count for follower
        UPDATE user_stats
        SET following_count = GREATEST(0, following_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.follower_id;

        -- Decrement follower count for following
        UPDATE user_stats
        SET follower_count = GREATEST(0, follower_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = OLD.following_id;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: update_group_comment_votes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_comment_votes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_comment_id INTEGER;
BEGIN
    -- Get comment_id from NEW or OLD
    target_comment_id := COALESCE(NEW.comment_id, OLD.comment_id);

    -- Skip if this is for a post vote
    IF target_comment_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE comment_id = target_comment_id;

    -- Calculate score
    new_score := upvote_count - downvote_count;

    -- Update comment
    UPDATE group_comments
    SET
        upvotes = upvote_count,
        downvotes = downvote_count,
        score = new_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_comment_id;

    RETURN NULL;
END;
$$;


--
-- Name: update_group_member_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_member_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'active') THEN
        UPDATE groups
        SET member_count = member_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.group_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'active') THEN
        UPDATE groups
        SET member_count = GREATEST(0, member_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.group_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Status changed from active to something else
        IF OLD.status = 'active' AND NEW.status != 'active' THEN
            UPDATE groups
            SET member_count = GREATEST(0, member_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        -- Status changed to active from something else
        ELSIF OLD.status != 'active' AND NEW.status = 'active' THEN
            UPDATE groups
            SET member_count = member_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: update_group_post_comment_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_post_comment_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
        UPDATE group_posts
        SET comment_count = comment_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
        UPDATE group_posts
        SET comment_count = GREATEST(0, comment_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.post_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'published' AND NEW.status != 'published' THEN
            UPDATE group_posts
            SET comment_count = GREATEST(0, comment_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id;
        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
            UPDATE group_posts
            SET comment_count = comment_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.post_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: update_group_post_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_post_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status = 'published') THEN
        UPDATE groups
        SET post_count = post_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.group_id;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'published') THEN
        UPDATE groups
        SET post_count = GREATEST(0, post_count - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = OLD.group_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        IF OLD.status = 'published' AND NEW.status != 'published' THEN
            UPDATE groups
            SET post_count = GREATEST(0, post_count - 1),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        ELSIF OLD.status != 'published' AND NEW.status = 'published' THEN
            UPDATE groups
            SET post_count = post_count + 1,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = NEW.group_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: update_group_post_votes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_group_post_votes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    upvote_count INTEGER;
    downvote_count INTEGER;
    new_score INTEGER;
    target_post_id INTEGER;
BEGIN
    -- Get post_id from NEW or OLD
    target_post_id := COALESCE(NEW.post_id, OLD.post_id);

    -- Skip if this is for a comment vote
    IF target_post_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Get current vote counts
    SELECT
        COUNT(*) FILTER (WHERE vote_type = 'upvote'),
        COUNT(*) FILTER (WHERE vote_type = 'downvote')
    INTO upvote_count, downvote_count
    FROM group_votes
    WHERE post_id = target_post_id;

    -- Calculate score
    new_score := upvote_count - downvote_count;

    -- Update post
    UPDATE group_posts
    SET
        upvotes = upvote_count,
        downvotes = downvote_count,
        score = new_score,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = target_post_id;

    RETURN NULL;
END;
$$;


--
-- Name: update_helpful_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_helpful_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_user_id INTEGER;
BEGIN
    -- Get the user who created the content
    IF NEW.target_type = 'post' THEN
        SELECT user_id INTO target_user_id FROM posts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'comment' THEN
        SELECT user_id INTO target_user_id FROM comments WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'user' THEN
        target_user_id := NEW.target_id;
    END IF;

    IF target_user_id IS NOT NULL THEN
        -- Increment helpful count
        INSERT INTO user_reputation (user_id, helpful_count)
        VALUES (target_user_id, 1)
        ON CONFLICT (user_id) DO UPDATE
        SET helpful_count = user_reputation.helpful_count + 1,
            updated_at = CURRENT_TIMESTAMP;

        -- Recalculate reputation score
        PERFORM calculate_reputation_score(target_user_id);
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: update_participant_last_read(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_participant_last_read() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE conversation_participants
    SET last_read_at = NEW.read_at
    WHERE conversation_id = (SELECT conversation_id FROM messages WHERE id = NEW.message_id)
      AND user_id = NEW.user_id
      AND (last_read_at IS NULL OR last_read_at < NEW.read_at);
    RETURN NEW;
END;
$$;


--
-- Name: update_poll_vote_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_poll_vote_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update option vote count
    IF TG_OP = 'INSERT' THEN
        UPDATE poll_options
        SET vote_count = vote_count + 1
        WHERE id = NEW.option_id;

        UPDATE group_posts
        SET poll_total_votes = poll_total_votes + 1
        WHERE id = NEW.post_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE poll_options
        SET vote_count = vote_count - 1
        WHERE id = OLD.option_id;

        UPDATE group_posts
        SET poll_total_votes = poll_total_votes - 1
        WHERE id = OLD.post_id;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Remove vote from old option
        UPDATE poll_options
        SET vote_count = vote_count - 1
        WHERE id = OLD.option_id;

        -- Add vote to new option
        UPDATE poll_options
        SET vote_count = vote_count + 1
        WHERE id = NEW.option_id;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: update_share_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_share_counts() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    post_owner_id INTEGER;
BEGIN
    -- Get the post owner
    SELECT user_id INTO post_owner_id FROM posts WHERE id = NEW.post_id;

    IF (TG_OP = 'INSERT') THEN
        -- Increment share count for post owner
        UPDATE user_stats
        SET total_shares_received = total_shares_received + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = post_owner_id;

    ELSIF (TG_OP = 'DELETE') THEN
        -- Decrement share count for post owner
        UPDATE user_stats
        SET total_shares_received = GREATEST(0, total_shares_received - 1),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = post_owner_id;
    END IF;

    RETURN NULL;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


--
-- Name: update_user_location(integer, numeric, numeric, character varying, character varying, character varying, character varying, character varying, integer, inet, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying DEFAULT NULL::character varying, p_city character varying DEFAULT NULL::character varying, p_state character varying DEFAULT NULL::character varying, p_zip character varying DEFAULT NULL::character varying, p_country character varying DEFAULT NULL::character varying, p_accuracy integer DEFAULT NULL::integer, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Update users table with all location fields
    UPDATE users
    SET
        location_latitude = p_lat,
        location_longitude = p_lon,
        address = COALESCE(p_address, address),
        location_city = COALESCE(p_city, location_city),
        location_state = COALESCE(p_state, location_state),
        location_zip = COALESCE(p_zip, location_zip),
        location_country = COALESCE(p_country, location_country),
        location_accuracy = COALESCE(p_accuracy, location_accuracy),
        location_updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Add to location history
    INSERT INTO location_history (
        user_id,
        location_latitude,
        location_longitude,
        location_city,
        location_state,
        location_country,
        accuracy,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_lat,
        p_lon,
        p_city,
        p_state,
        p_country,
        p_accuracy,
        p_ip_address,
        p_user_agent
    );

    RETURN TRUE;
END;
$$;


--
-- Name: FUNCTION update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying, p_city character varying, p_state character varying, p_zip character varying, p_country character varying, p_accuracy integer, p_ip_address inet, p_user_agent text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.update_user_location(p_user_id integer, p_lat numeric, p_lon numeric, p_address character varying, p_city character varying, p_state character varying, p_zip character varying, p_country character varying, p_accuracy integer, p_ip_address inet, p_user_agent text) IS 'Update user location with address, city, state, zip, country and add entry to history';


--
-- Name: update_user_reputation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_user_reputation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    target_user_id INTEGER;
    avg_rating DECIMAL(3,2);
    total_count INTEGER;
    pos_count INTEGER;
    neu_count INTEGER;
    neg_count INTEGER;
    verified_count INTEGER;
    dist JSONB;
    post_avg DECIMAL(3,2);
    comment_avg DECIMAL(3,2);
    interaction_avg DECIMAL(3,2);
    first_rating TIMESTAMP;
BEGIN
    -- Determine which user's reputation to update
    IF (TG_OP = 'DELETE') THEN
        target_user_id := OLD.rated_user_id;
    ELSE
        target_user_id := NEW.rated_user_id;
    END IF;

    -- Calculate aggregated metrics
    SELECT
        COALESCE(AVG(rating_value), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE rating_value >= 4),
        COUNT(*) FILTER (WHERE rating_value = 3),
        COUNT(*) FILTER (WHERE rating_value <= 2),
        COUNT(*) FILTER (WHERE is_verified = true),
        jsonb_build_object(
            '1', COUNT(*) FILTER (WHERE rating_value = 1),
            '2', COUNT(*) FILTER (WHERE rating_value = 2),
            '3', COUNT(*) FILTER (WHERE rating_value = 3),
            '4', COUNT(*) FILTER (WHERE rating_value = 4),
            '5', COUNT(*) FILTER (WHERE rating_value = 5)
        ),
        MIN(created_at)
    INTO avg_rating, total_count, pos_count, neu_count, neg_count, verified_count, dist, first_rating
    FROM user_ratings
    WHERE rated_user_id = target_user_id;

    -- Calculate category averages
    SELECT COALESCE(AVG(rating_value), 0) INTO post_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'post';

    SELECT COALESCE(AVG(rating_value), 0) INTO comment_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'comment';

    SELECT COALESCE(AVG(rating_value), 0) INTO interaction_avg
    FROM user_ratings WHERE rated_user_id = target_user_id AND rating_type = 'interaction';

    -- Upsert reputation record
    INSERT INTO user_reputation (
        user_id,
        total_ratings_received,
        average_rating,
        rating_distribution,
        positive_ratings_count,
        neutral_ratings_count,
        negative_ratings_count,
        verified_ratings_count,
        post_rating_avg,
        comment_rating_avg,
        interaction_rating_avg,
        first_rating_at,
        last_rating_at
    ) VALUES (
        target_user_id,
        total_count,
        avg_rating,
        dist,
        pos_count,
        neu_count,
        neg_count,
        verified_count,
        post_avg,
        comment_avg,
        interaction_avg,
        first_rating,
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_ratings_received = total_count,
        average_rating = avg_rating,
        rating_distribution = dist,
        positive_ratings_count = pos_count,
        neutral_ratings_count = neu_count,
        negative_ratings_count = neg_count,
        verified_ratings_count = verified_count,
        post_rating_avg = post_avg,
        comment_rating_avg = comment_avg,
        interaction_rating_avg = interaction_avg,
        first_rating_at = COALESCE(user_reputation.first_rating_at, first_rating),
        last_rating_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP;

    RETURN NULL;
END;
$$;


--
-- Name: validate_group_conversation(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_group_conversation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.group_id IS NOT NULL THEN
    IF NEW.type != 'group' THEN
      RAISE EXCEPTION 'Group conversations must have type = group';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: comment_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_interactions (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    interaction_type character varying(50) NOT NULL,
    user_id integer,
    session_id character varying(255),
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT comment_interactions_interaction_type_check CHECK (((interaction_type)::text = ANY ((ARRAY['view'::character varying, 'reply'::character varying, 'reaction'::character varying, 'share'::character varying, 'deep_read'::character varying, 'quote'::character varying])::text[])))
);


--
-- Name: TABLE comment_interactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comment_interactions IS 'Tracks all interactions with comments (views, replies, reactions, etc)';


--
-- Name: COLUMN comment_interactions.interaction_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comment_interactions.interaction_type IS 'Type of interaction: view, reply, reaction, share, deep_read, quote';


--
-- Name: comment_interactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comment_interactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comment_interactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comment_interactions_id_seq OWNED BY public.comment_interactions.id;


--
-- Name: comment_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comment_metrics (
    comment_id integer NOT NULL,
    view_count integer DEFAULT 0,
    unique_view_count integer DEFAULT 0,
    reply_count integer DEFAULT 0,
    reaction_count integer DEFAULT 0,
    share_count integer DEFAULT 0,
    deep_read_count integer DEFAULT 0,
    total_interaction_count integer DEFAULT 0,
    recency_score double precision DEFAULT 0.0,
    interaction_rate double precision DEFAULT 0.0,
    engagement_score double precision DEFAULT 0.0,
    combined_algorithm_score double precision DEFAULT 0.0,
    first_interaction_at timestamp without time zone,
    last_interaction_at timestamp without time zone,
    peak_interaction_period timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    last_updated timestamp without time zone DEFAULT now()
);


--
-- Name: TABLE comment_metrics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comment_metrics IS 'Aggregated metrics and scores for comment engagement';


--
-- Name: COLUMN comment_metrics.combined_algorithm_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.comment_metrics.combined_algorithm_score IS 'Combined score for ranking comments by engagement and relevance';


--
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    parent_id integer,
    content text NOT NULL,
    is_published boolean DEFAULT true,
    depth integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    user_id integer NOT NULL,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    left_at timestamp without time zone,
    role character varying(20) DEFAULT 'member'::character varying,
    muted boolean DEFAULT false,
    archived boolean DEFAULT false,
    last_read_at timestamp without time zone,
    CONSTRAINT conversation_participants_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'member'::character varying])::text[])))
);


--
-- Name: TABLE conversation_participants; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversation_participants IS 'Maps users to conversations with their participation details';


--
-- Name: COLUMN conversation_participants.left_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversation_participants.left_at IS 'When user left conversation (NULL = still active)';


--
-- Name: COLUMN conversation_participants.last_read_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversation_participants.last_read_at IS 'Last time user read messages in this conversation';


--
-- Name: conversation_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversation_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversation_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversation_participants_id_seq OWNED BY public.conversation_participants.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    title character varying(255),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_message_id integer,
    group_id integer,
    CONSTRAINT conversations_type_check CHECK (((type)::text = ANY ((ARRAY['direct'::character varying, 'group'::character varying])::text[])))
);


--
-- Name: TABLE conversations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.conversations IS 'Stores conversation/chat threads';


--
-- Name: COLUMN conversations.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversations.type IS 'Type of conversation: direct (1-on-1) or group';


--
-- Name: COLUMN conversations.last_message_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversations.last_message_id IS 'Most recent message for quick preview';


--
-- Name: COLUMN conversations.group_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.conversations.group_id IS 'Associated group if this is a group-wide chat. Null for regular group chats and direct messages.';


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follows (
    id integer NOT NULL,
    follower_id integer NOT NULL,
    following_id integer NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT follows_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'muted'::character varying, 'blocked'::character varying])::text[]))),
    CONSTRAINT no_self_follow CHECK ((follower_id <> following_id))
);


--
-- Name: TABLE follows; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.follows IS 'User follow relationships with status tracking';


--
-- Name: COLUMN follows.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.follows.status IS 'active: normal follow, muted: following but notifications off, blocked: no longer following';


--
-- Name: follows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.follows_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: follows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.follows_id_seq OWNED BY public.follows.id;


--
-- Name: group_activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_activity_log (
    id integer NOT NULL,
    group_id integer NOT NULL,
    user_id integer,
    action_type character varying(50) NOT NULL,
    target_type character varying(50),
    target_id integer,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE group_activity_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_activity_log IS 'Audit log for moderation actions';


--
-- Name: group_activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_activity_log_id_seq OWNED BY public.group_activity_log.id;


--
-- Name: group_comment_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_comment_media (
    id integer NOT NULL,
    comment_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    media_type character varying(20),
    width integer,
    height integer,
    duration integer,
    thumbnail_url character varying(500),
    display_order integer DEFAULT 0,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_comment_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'pdf'::character varying, 'model'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT valid_comment_file_path CHECK (((file_path)::text ~ '^public/media/groups/.*'::text))
);


--
-- Name: TABLE group_comment_media; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_comment_media IS 'Media attachments for group comments';


--
-- Name: group_comment_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_comment_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_comment_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_comment_media_id_seq OWNED BY public.group_comment_media.id;


--
-- Name: group_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_comments (
    id integer NOT NULL,
    post_id integer NOT NULL,
    parent_id integer,
    user_id integer NOT NULL,
    content text NOT NULL,
    status character varying(20) DEFAULT 'published'::character varying,
    removed_by integer,
    removed_at timestamp without time zone,
    removal_reason text,
    upvotes integer DEFAULT 0,
    downvotes integer DEFAULT 0,
    score integer DEFAULT 0,
    depth integer DEFAULT 0,
    path public.ltree,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    edited_at timestamp without time zone,
    CONSTRAINT group_comments_status_check CHECK (((status)::text = ANY ((ARRAY['published'::character varying, 'removed'::character varying, 'deleted'::character varying])::text[])))
);


--
-- Name: TABLE group_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_comments IS 'Nested comments on group posts using ltree';


--
-- Name: COLUMN group_comments.depth; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_comments.depth IS 'Nesting depth (0 for top-level comments)';


--
-- Name: COLUMN group_comments.path; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_comments.path IS 'ltree path for efficient nested comment queries';


--
-- Name: group_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_comments_id_seq OWNED BY public.group_comments.id;


--
-- Name: group_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_invitations (
    id integer NOT NULL,
    group_id integer NOT NULL,
    inviter_id integer NOT NULL,
    invitee_id integer,
    invitee_email character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    token character varying(255),
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    responded_at timestamp without time zone,
    CONSTRAINT group_invitations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'expired'::character varying])::text[]))),
    CONSTRAINT valid_invitee CHECK (((invitee_id IS NOT NULL) OR (invitee_email IS NOT NULL)))
);


--
-- Name: TABLE group_invitations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_invitations IS 'Invitations to join groups';


--
-- Name: group_invitations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_invitations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_invitations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_invitations_id_seq OWNED BY public.group_invitations.id;


--
-- Name: group_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_memberships (
    id integer NOT NULL,
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) DEFAULT 'member'::character varying,
    status character varying(20) DEFAULT 'active'::character varying,
    joined_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    invited_by integer,
    banned_by integer,
    banned_reason text,
    banned_at timestamp without time zone,
    CONSTRAINT group_memberships_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'moderator'::character varying, 'member'::character varying])::text[]))),
    CONSTRAINT group_memberships_status_check CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'banned'::character varying, 'pending'::character varying, 'invited'::character varying])::text[])))
);


--
-- Name: TABLE group_memberships; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_memberships IS 'User memberships in groups with roles (admin, moderator, member)';


--
-- Name: COLUMN group_memberships.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_memberships.role IS 'admin: full control, moderator: can moderate content, member: regular member';


--
-- Name: group_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_memberships_id_seq OWNED BY public.group_memberships.id;


--
-- Name: group_post_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_post_media (
    id integer NOT NULL,
    post_id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100) NOT NULL,
    media_type character varying(20),
    width integer,
    height integer,
    duration integer,
    thumbnail_url character varying(500),
    display_order integer DEFAULT 0,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_post_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'pdf'::character varying, 'model'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT valid_file_path CHECK (((file_path)::text ~ '^public/media/groups/.*'::text))
);


--
-- Name: TABLE group_post_media; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_post_media IS 'Media attachments for group posts';


--
-- Name: group_post_media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_post_media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_post_media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_post_media_id_seq OWNED BY public.group_post_media.id;


--
-- Name: group_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_posts (
    id integer NOT NULL,
    group_id integer NOT NULL,
    user_id integer NOT NULL,
    title character varying(300),
    content text,
    post_type character varying(20) DEFAULT 'text'::character varying,
    link_url character varying(1000),
    link_title character varying(500),
    link_description text,
    link_thumbnail character varying(500),
    status character varying(20) DEFAULT 'published'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    removed_by integer,
    removed_at timestamp without time zone,
    removal_reason text,
    upvotes integer DEFAULT 0,
    downvotes integer DEFAULT 0,
    score integer DEFAULT 0,
    comment_count integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    is_locked boolean DEFAULT false,
    is_nsfw boolean DEFAULT false,
    is_spoiler boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    edited_at timestamp without time zone,
    poll_question character varying(500),
    poll_ends_at timestamp without time zone,
    poll_allow_multiple boolean DEFAULT false,
    poll_total_votes integer DEFAULT 0,
    CONSTRAINT group_posts_post_type_check CHECK (((post_type)::text = ANY ((ARRAY['text'::character varying, 'link'::character varying, 'media'::character varying, 'poll'::character varying])::text[]))),
    CONSTRAINT group_posts_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'pending'::character varying, 'published'::character varying, 'removed'::character varying, 'deleted'::character varying])::text[]))),
    CONSTRAINT valid_content CHECK (((((post_type)::text = 'text'::text) AND ((title IS NOT NULL) OR (content IS NOT NULL))) OR (((post_type)::text = 'link'::text) AND (link_url IS NOT NULL)) OR ((post_type)::text = 'media'::text) OR ((post_type)::text = 'poll'::text)))
);


--
-- Name: TABLE group_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_posts IS 'Posts within groups';


--
-- Name: COLUMN group_posts.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_posts.score IS 'Reddit-style score: upvotes - downvotes';


--
-- Name: COLUMN group_posts.poll_question; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_posts.poll_question IS 'Question text for poll posts';


--
-- Name: COLUMN group_posts.poll_ends_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_posts.poll_ends_at IS 'When the poll closes (NULL = never)';


--
-- Name: COLUMN group_posts.poll_allow_multiple; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_posts.poll_allow_multiple IS 'Allow users to vote for multiple options';


--
-- Name: COLUMN group_posts.poll_total_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.group_posts.poll_total_votes IS 'Total number of votes cast on this poll';


--
-- Name: group_posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_posts_id_seq OWNED BY public.group_posts.id;


--
-- Name: group_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_votes (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer,
    comment_id integer,
    vote_type character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT group_votes_vote_type_check CHECK (((vote_type)::text = ANY ((ARRAY['upvote'::character varying, 'downvote'::character varying])::text[]))),
    CONSTRAINT valid_vote_target CHECK ((((post_id IS NOT NULL) AND (comment_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL))))
);


--
-- Name: TABLE group_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.group_votes IS 'Upvote/downvote system for posts and comments';


--
-- Name: group_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_votes_id_seq OWNED BY public.group_votes.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    description text,
    avatar_url character varying(500),
    banner_url character varying(500),
    visibility character varying(20) DEFAULT 'public'::character varying,
    require_approval boolean DEFAULT false,
    allow_posts boolean DEFAULT true,
    post_approval_required boolean DEFAULT false,
    allow_multimedia boolean DEFAULT true,
    allowed_media_types text[] DEFAULT ARRAY['image'::text, 'video'::text, 'pdf'::text, 'model'::text, 'link'::text],
    max_file_size_mb integer DEFAULT 50,
    creator_id integer NOT NULL,
    member_count integer DEFAULT 0,
    post_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    settings jsonb DEFAULT '{}'::jsonb,
    allow_public_posting boolean DEFAULT false,
    location_restricted boolean DEFAULT false,
    location_type character varying(20),
    location_latitude numeric(10,8),
    location_longitude numeric(11,8),
    location_radius_km numeric(10,2),
    location_country character varying(2),
    location_state character varying(100),
    location_city character varying(100),
    location_polygon jsonb,
    location_name character varying(255),
    moderator_can_remove_posts boolean DEFAULT true,
    moderator_can_remove_comments boolean DEFAULT true,
    moderator_can_ban_members boolean DEFAULT true,
    moderator_can_approve_posts boolean DEFAULT true,
    moderator_can_approve_members boolean DEFAULT true,
    moderator_can_pin_posts boolean DEFAULT true,
    moderator_can_lock_posts boolean DEFAULT true,
    allow_text_posts boolean DEFAULT true,
    allow_link_posts boolean DEFAULT true,
    allow_image_posts boolean DEFAULT true,
    allow_video_posts boolean DEFAULT true,
    allow_poll_posts boolean DEFAULT true,
    rules text,
    conversation_id integer,
    CONSTRAINT groups_location_type_check CHECK (((location_type)::text = ANY ((ARRAY['radius'::character varying, 'country'::character varying, 'state'::character varying, 'city'::character varying, 'polygon'::character varying])::text[]))),
    CONSTRAINT groups_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying, 'invite_only'::character varying])::text[]))),
    CONSTRAINT valid_name CHECK (((name)::text ~ '^[a-zA-Z0-9_-]{3,100}$'::text)),
    CONSTRAINT valid_slug CHECK (((slug)::text ~ '^[a-z0-9-]{3,100}$'::text))
);


--
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.groups IS 'Reddit-style community groups';


--
-- Name: COLUMN groups.visibility; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.visibility IS 'public: anyone can view, private: members only, invite_only: invite required';


--
-- Name: COLUMN groups.post_approval_required; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.post_approval_required IS 'If true, posts require moderator approval before publishing';


--
-- Name: COLUMN groups.allow_public_posting; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.allow_public_posting IS 'If true, non-members can post, comment, and vote in this group without joining';


--
-- Name: COLUMN groups.location_restricted; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_restricted IS 'If true, users must be in the specified location to join/post';


--
-- Name: COLUMN groups.location_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_type IS 'Type of location restriction: radius (circle), country, state, city, or polygon (custom area)';


--
-- Name: COLUMN groups.location_latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_latitude IS 'Center latitude for radius-based restrictions';


--
-- Name: COLUMN groups.location_longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_longitude IS 'Center longitude for radius-based restrictions';


--
-- Name: COLUMN groups.location_radius_km; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_radius_km IS 'Radius in kilometers for radius-based restrictions';


--
-- Name: COLUMN groups.location_country; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_country IS 'ISO 3166-1 alpha-2 country code (e.g., US, CA, GB)';


--
-- Name: COLUMN groups.location_state; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_state IS 'State/province/region name';


--
-- Name: COLUMN groups.location_city; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_city IS 'City name';


--
-- Name: COLUMN groups.location_polygon; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_polygon IS 'GeoJSON polygon for custom area restrictions';


--
-- Name: COLUMN groups.location_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.location_name IS 'Display name for the location (e.g., "San Francisco Bay Area")';


--
-- Name: COLUMN groups.moderator_can_remove_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_remove_posts IS 'Allow moderators to remove posts (admins can always remove)';


--
-- Name: COLUMN groups.moderator_can_remove_comments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_remove_comments IS 'Allow moderators to remove comments (admins can always remove)';


--
-- Name: COLUMN groups.moderator_can_ban_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_ban_members IS 'Allow moderators to ban/unban members (admins can always ban)';


--
-- Name: COLUMN groups.moderator_can_approve_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_approve_posts IS 'Allow moderators to approve pending posts (admins can always approve)';


--
-- Name: COLUMN groups.moderator_can_approve_members; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_approve_members IS 'Allow moderators to approve membership requests (admins can always approve)';


--
-- Name: COLUMN groups.moderator_can_pin_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_pin_posts IS 'Allow moderators to pin/unpin posts (admins can always pin)';


--
-- Name: COLUMN groups.moderator_can_lock_posts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.moderator_can_lock_posts IS 'Allow moderators to lock/unlock posts (admins can always lock)';


--
-- Name: COLUMN groups.conversation_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.groups.conversation_id IS 'Optional group chat conversation for members. Null if chat is disabled.';


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: helpful_marks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.helpful_marks (
    id integer NOT NULL,
    user_id integer NOT NULL,
    target_type character varying(20) NOT NULL,
    target_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT helpful_marks_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['post'::character varying, 'comment'::character varying, 'user'::character varying])::text[])))
);


--
-- Name: TABLE helpful_marks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.helpful_marks IS 'Track when users mark content as helpful';


--
-- Name: helpful_marks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.helpful_marks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: helpful_marks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.helpful_marks_id_seq OWNED BY public.helpful_marks.id;


--
-- Name: location_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_history (
    id integer NOT NULL,
    user_id integer NOT NULL,
    location_latitude numeric(10,7) NOT NULL,
    location_longitude numeric(10,7) NOT NULL,
    location_city character varying(100),
    location_state character varying(100),
    location_country character varying(100),
    accuracy integer,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE location_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.location_history IS 'Historical log of user location changes for privacy audit';


--
-- Name: location_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.location_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: location_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.location_history_id_seq OWNED BY public.location_history.id;


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer,
    comment_id integer,
    filename character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_url character varying(500) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size integer NOT NULL,
    media_type character varying(20) NOT NULL,
    width integer,
    height integer,
    duration integer,
    alt_text character varying(500),
    is_processed boolean DEFAULT false,
    thumbnail_path character varying(500),
    thumbnail_url character varying(500),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT media_belongs_to_post_or_comment CHECK ((((post_id IS NOT NULL) AND (comment_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL)))),
    CONSTRAINT media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'audio'::character varying, 'document'::character varying])::text[])))
);


--
-- Name: media_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.media_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: media_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.media_id_seq OWNED BY public.media.id;


--
-- Name: message_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reactions (
    id integer NOT NULL,
    message_id integer NOT NULL,
    user_id integer NOT NULL,
    emoji character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE message_reactions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_reactions IS 'Stores emoji reactions to messages';


--
-- Name: COLUMN message_reactions.emoji; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.message_reactions.emoji IS 'Unicode emoji character or sequence';


--
-- Name: message_reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_reactions_id_seq OWNED BY public.message_reactions.id;


--
-- Name: message_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.message_reads (
    id integer NOT NULL,
    message_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE message_reads; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.message_reads IS 'Tracks which messages have been read by which users';


--
-- Name: message_reads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.message_reads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: message_reads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.message_reads_id_seq OWNED BY public.message_reads.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    sender_id integer NOT NULL,
    content text,
    message_type character varying(20) DEFAULT 'text'::character varying,
    attachment_url character varying(500),
    attachment_type character varying(100),
    attachment_size integer,
    attachment_name character varying(255),
    reply_to_id integer,
    edited_at timestamp without time zone,
    deleted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['text'::character varying, 'image'::character varying, 'file'::character varying, 'system'::character varying])::text[])))
);


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Stores individual messages within conversations';


--
-- Name: COLUMN messages.reply_to_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.reply_to_id IS 'Reference to message being replied to';


--
-- Name: COLUMN messages.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.deleted_at IS 'Soft delete timestamp - message content hidden but structure preserved';


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: nearby_search_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nearby_search_cache (
    id integer NOT NULL,
    user_id integer NOT NULL,
    search_lat numeric(10,7) NOT NULL,
    search_lon numeric(10,7) NOT NULL,
    radius_miles integer NOT NULL,
    nearby_user_ids integer[] NOT NULL,
    result_count integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '00:15:00'::interval)
);


--
-- Name: TABLE nearby_search_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.nearby_search_cache IS 'Cache for nearby user searches to improve performance';


--
-- Name: nearby_search_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.nearby_search_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: nearby_search_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.nearby_search_cache_id_seq OWNED BY public.nearby_search_cache.id;


--
-- Name: notification_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_batches (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id integer NOT NULL,
    count integer DEFAULT 1,
    last_actor_id integer,
    sample_actor_ids integer[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE notification_batches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_batches IS 'Batched/grouped notifications to reduce spam';


--
-- Name: COLUMN notification_batches.sample_actor_ids; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_batches.sample_actor_ids IS 'Array of up to 5 recent actor IDs for preview';


--
-- Name: notification_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_batches_id_seq OWNED BY public.notification_batches.id;


--
-- Name: notification_preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_preferences (
    id integer NOT NULL,
    user_id integer NOT NULL,
    notification_type character varying(50) NOT NULL,
    email_enabled boolean DEFAULT true,
    push_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    frequency character varying(20) DEFAULT 'instant'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_preferences_frequency_check CHECK (((frequency)::text = ANY ((ARRAY['instant'::character varying, 'digest_hourly'::character varying, 'digest_daily'::character varying, 'digest_weekly'::character varying, 'never'::character varying])::text[])))
);


--
-- Name: TABLE notification_preferences; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notification_preferences IS 'User preferences for different notification types';


--
-- Name: COLUMN notification_preferences.frequency; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notification_preferences.frequency IS 'How often to send: instant, digest_hourly, digest_daily, digest_weekly, never';


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_preferences_id_seq OWNED BY public.notification_preferences.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    actor_id integer,
    entity_type character varying(50),
    entity_id integer,
    action_url character varying(500),
    priority character varying(20) DEFAULT 'normal'::character varying,
    read_at timestamp without time zone,
    clicked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    CONSTRAINT notifications_priority_check CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying, 'urgent'::character varying])::text[])))
);


--
-- Name: TABLE notifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notifications IS 'Stores all user notifications';


--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.type IS 'Type of notification: follow, comment, reaction, mention, group_invite, new_message, etc.';


--
-- Name: COLUMN notifications.actor_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.actor_id IS 'User who triggered the notification (e.g., who followed, commented, etc.)';


--
-- Name: COLUMN notifications.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.entity_type IS 'Type of entity: post, comment, group, message, etc.';


--
-- Name: COLUMN notifications.entity_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.entity_id IS 'ID of the related entity';


--
-- Name: COLUMN notifications.action_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.action_url IS 'URL to navigate to when notification is clicked';


--
-- Name: COLUMN notifications.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.priority IS 'Priority level: low, normal, high, urgent';


--
-- Name: COLUMN notifications.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notifications.expires_at IS 'Expiration time for time-sensitive notifications';


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: poll_options; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.poll_options (
    id integer NOT NULL,
    post_id integer NOT NULL,
    option_text character varying(200) NOT NULL,
    option_order integer DEFAULT 0 NOT NULL,
    vote_count integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE poll_options; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.poll_options IS 'Poll options for group post polls';


--
-- Name: poll_options_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.poll_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: poll_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.poll_options_id_seq OWNED BY public.poll_options.id;


--
-- Name: poll_votes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.poll_votes (
    id integer NOT NULL,
    post_id integer NOT NULL,
    option_id integer NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE poll_votes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.poll_votes IS 'User votes on poll options';


--
-- Name: poll_votes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.poll_votes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: poll_votes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.poll_votes_id_seq OWNED BY public.poll_votes.id;


--
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posts (
    id integer NOT NULL,
    user_id integer NOT NULL,
    content text NOT NULL,
    privacy_level character varying(20) DEFAULT 'public'::character varying,
    is_published boolean DEFAULT true,
    is_archived boolean DEFAULT false,
    views_count integer DEFAULT 0,
    scheduled_for timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    deleted_by integer,
    deletion_reason text,
    CONSTRAINT posts_privacy_level_check CHECK (((privacy_level)::text = ANY ((ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying])::text[])))
);


--
-- Name: COLUMN posts.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.deleted_at IS 'Timestamp when the post was soft-deleted (NULL if not deleted)';


--
-- Name: COLUMN posts.deleted_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.deleted_by IS 'User ID of the admin/moderator who deleted the post';


--
-- Name: COLUMN posts.deletion_reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.posts.deletion_reason IS 'Reason provided for deleting the post';


--
-- Name: posts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posts_id_seq OWNED BY public.posts.id;


--
-- Name: rating_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rating_reports (
    id integer NOT NULL,
    rating_id integer NOT NULL,
    reporter_id integer NOT NULL,
    report_reason character varying(50) NOT NULL,
    report_details text,
    status character varying(20) DEFAULT 'pending'::character varying,
    reviewed_by integer,
    reviewed_at timestamp without time zone,
    resolution_notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT rating_reports_report_reason_check CHECK (((report_reason)::text = ANY ((ARRAY['spam'::character varying, 'inappropriate'::character varying, 'fake'::character varying, 'harassment'::character varying, 'other'::character varying])::text[]))),
    CONSTRAINT rating_reports_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'reviewed'::character varying, 'resolved'::character varying, 'dismissed'::character varying])::text[])))
);


--
-- Name: TABLE rating_reports; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.rating_reports IS 'Reports for disputed or inappropriate ratings';


--
-- Name: rating_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rating_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rating_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rating_reports_id_seq OWNED BY public.rating_reports.id;


--
-- Name: reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reactions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer,
    comment_id integer,
    emoji_name character varying(50) NOT NULL,
    emoji_unicode character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reaction_belongs_to_post_or_comment CHECK ((((post_id IS NOT NULL) AND (comment_id IS NULL)) OR ((post_id IS NULL) AND (comment_id IS NOT NULL))))
);


--
-- Name: reactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reactions_id_seq OWNED BY public.reactions.id;


--
-- Name: shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shares (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    share_type character varying(20) DEFAULT 'repost'::character varying,
    share_comment text,
    visibility character varying(20) DEFAULT 'public'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT shares_share_type_check CHECK (((share_type)::text = ANY ((ARRAY['repost'::character varying, 'quote'::character varying, 'external'::character varying])::text[]))),
    CONSTRAINT shares_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'friends'::character varying, 'private'::character varying])::text[])))
);


--
-- Name: TABLE shares; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.shares IS 'Post shares and reposts by users';


--
-- Name: shares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shares_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: shares_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shares_id_seq OWNED BY public.shares.id;


--
-- Name: timeline_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.timeline_cache (
    id integer NOT NULL,
    user_id integer NOT NULL,
    post_id integer NOT NULL,
    score numeric(10,2) DEFAULT 0 NOT NULL,
    reason character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '7 days'::interval)
);


--
-- Name: TABLE timeline_cache; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.timeline_cache IS 'Pre-computed timeline entries with scoring';


--
-- Name: COLUMN timeline_cache.score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_cache.score IS 'Calculated score (0-100) based on relevance algorithm';


--
-- Name: COLUMN timeline_cache.reason; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_cache.reason IS 'Why this post is in timeline: following, popular, shared, suggested';


--
-- Name: COLUMN timeline_cache.expires_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.timeline_cache.expires_at IS 'When this timeline entry should be removed';


--
-- Name: timeline_cache_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.timeline_cache_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: timeline_cache_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.timeline_cache_id_seq OWNED BY public.timeline_cache.id;


--
-- Name: typing_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.typing_indicators (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    user_id integer NOT NULL,
    started_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '00:00:10'::interval)
);


--
-- Name: TABLE typing_indicators; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.typing_indicators IS 'Tracks real-time typing indicators (consider using Redis in production)';


--
-- Name: typing_indicators_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.typing_indicators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: typing_indicators_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.typing_indicators_id_seq OWNED BY public.typing_indicators.id;


--
-- Name: user_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_ratings (
    id integer NOT NULL,
    rater_id integer NOT NULL,
    rated_user_id integer NOT NULL,
    rating_type character varying(50) NOT NULL,
    rating_value integer NOT NULL,
    context_type character varying(50),
    context_id integer,
    review_text text,
    is_anonymous boolean DEFAULT false,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_rating CHECK ((rater_id <> rated_user_id)),
    CONSTRAINT user_ratings_rating_type_check CHECK (((rating_type)::text = ANY ((ARRAY['profile'::character varying, 'post'::character varying, 'comment'::character varying, 'interaction'::character varying])::text[]))),
    CONSTRAINT user_ratings_rating_value_check CHECK (((rating_value >= 1) AND (rating_value <= 5)))
);


--
-- Name: TABLE user_ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_ratings IS 'User ratings with context and reviews';


--
-- Name: COLUMN user_ratings.rating_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_ratings.rating_type IS 'Category: profile, post, comment, interaction';


--
-- Name: COLUMN user_ratings.context_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_ratings.context_type IS 'What was rated: post, comment, message, general';


--
-- Name: COLUMN user_ratings.is_verified; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_ratings.is_verified IS 'Rating from verified interaction';


--
-- Name: user_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_ratings_id_seq OWNED BY public.user_ratings.id;


--
-- Name: user_reputation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reputation (
    user_id integer NOT NULL,
    total_ratings_received integer DEFAULT 0,
    average_rating numeric(3,2) DEFAULT 0.00,
    rating_distribution jsonb DEFAULT '{"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}'::jsonb,
    reputation_score integer DEFAULT 0,
    reputation_level character varying(20) DEFAULT 'newcomer'::character varying,
    post_rating_avg numeric(3,2) DEFAULT 0.00,
    comment_rating_avg numeric(3,2) DEFAULT 0.00,
    interaction_rating_avg numeric(3,2) DEFAULT 0.00,
    verified_ratings_count integer DEFAULT 0,
    positive_ratings_count integer DEFAULT 0,
    neutral_ratings_count integer DEFAULT 0,
    negative_ratings_count integer DEFAULT 0,
    helpful_count integer DEFAULT 0,
    reported_count integer DEFAULT 0,
    quality_posts_count integer DEFAULT 0,
    quality_comments_count integer DEFAULT 0,
    badges jsonb DEFAULT '[]'::jsonb,
    achievements jsonb DEFAULT '[]'::jsonb,
    first_rating_at timestamp without time zone,
    last_rating_at timestamp without time zone,
    reputation_peak integer DEFAULT 0,
    reputation_peak_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_reputation_reputation_level_check CHECK (((reputation_level)::text = ANY ((ARRAY['newcomer'::character varying, 'member'::character varying, 'contributor'::character varying, 'veteran'::character varying, 'expert'::character varying, 'legend'::character varying])::text[])))
);


--
-- Name: TABLE user_reputation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_reputation IS 'Aggregated user reputation scores and metrics';


--
-- Name: COLUMN user_reputation.reputation_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_reputation.reputation_score IS 'Calculated score 0-1000';


--
-- Name: COLUMN user_reputation.reputation_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_reputation.reputation_level IS 'Level: newcomer, member, contributor, veteran, expert, legend';


--
-- Name: user_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_stats (
    user_id integer NOT NULL,
    follower_count integer DEFAULT 0,
    following_count integer DEFAULT 0,
    post_count integer DEFAULT 0,
    total_reactions_received integer DEFAULT 0,
    total_shares_received integer DEFAULT 0,
    total_comments_received integer DEFAULT 0,
    engagement_score numeric(10,2) DEFAULT 0,
    last_post_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE user_stats; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_stats IS 'Denormalized user statistics for performance';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    bio text,
    avatar_url character varying(500),
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    password_reset_token character varying(255),
    password_reset_expires timestamp without time zone,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location_latitude numeric(10,7),
    location_longitude numeric(10,7),
    location_city character varying(100),
    location_state character varying(100),
    location_country character varying(100),
    location_updated_at timestamp without time zone,
    location_accuracy integer,
    location_sharing character varying(20) DEFAULT 'off'::character varying,
    show_distance_in_profile boolean DEFAULT false,
    address character varying(255),
    location_zip character varying(20),
    banner_url character varying(500),
    website character varying(255),
    twitter_handle character varying(50),
    linkedin_url character varying(255),
    github_username character varying(50),
    job_title character varying(100),
    company character varying(100),
    tagline character varying(200),
    profile_visibility character varying(20) DEFAULT 'public'::character varying,
    hobbies public.hobby_type[],
    skills public.skill_type[],
    favorite_pets public.pet_type[],
    expertise public.expertise_type[],
    CONSTRAINT users_location_sharing_check CHECK (((location_sharing)::text = ANY ((ARRAY['exact'::character varying, 'city'::character varying, 'off'::character varying])::text[]))),
    CONSTRAINT users_profile_visibility_check CHECK (((profile_visibility)::text = ANY ((ARRAY['public'::character varying, 'followers'::character varying, 'private'::character varying])::text[])))
);


--
-- Name: COLUMN users.location_latitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.location_latitude IS 'Latitude coordinate for user location (WGS84)';


--
-- Name: COLUMN users.location_longitude; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.location_longitude IS 'Longitude coordinate for user location (WGS84)';


--
-- Name: COLUMN users.location_sharing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.location_sharing IS 'Privacy setting: exact (show precise location), city (show only city), off (hide location)';


--
-- Name: COLUMN users.show_distance_in_profile; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.show_distance_in_profile IS 'Whether to show distance to this user in search results';


--
-- Name: COLUMN users.address; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.address IS 'Street address for exact location sharing (e.g., "123 Main St")';


--
-- Name: COLUMN users.location_zip; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.location_zip IS 'ZIP/postal code for location';


--
-- Name: COLUMN users.hobbies; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.hobbies IS 'Array of user hobbies and interests (250+ options)';


--
-- Name: COLUMN users.skills; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.skills IS 'Array of user professional skills (300+ options)';


--
-- Name: COLUMN users.favorite_pets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.favorite_pets IS 'Array of user favorite pet types and breeds (400+ options)';


--
-- Name: COLUMN users.expertise; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.expertise IS 'Array of user areas of expertise (350+ options)';


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: comment_interactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_interactions ALTER COLUMN id SET DEFAULT nextval('public.comment_interactions_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: conversation_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants ALTER COLUMN id SET DEFAULT nextval('public.conversation_participants_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: follows id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows ALTER COLUMN id SET DEFAULT nextval('public.follows_id_seq'::regclass);


--
-- Name: group_activity_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activity_log ALTER COLUMN id SET DEFAULT nextval('public.group_activity_log_id_seq'::regclass);


--
-- Name: group_comment_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comment_media ALTER COLUMN id SET DEFAULT nextval('public.group_comment_media_id_seq'::regclass);


--
-- Name: group_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comments ALTER COLUMN id SET DEFAULT nextval('public.group_comments_id_seq'::regclass);


--
-- Name: group_invitations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations ALTER COLUMN id SET DEFAULT nextval('public.group_invitations_id_seq'::regclass);


--
-- Name: group_memberships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships ALTER COLUMN id SET DEFAULT nextval('public.group_memberships_id_seq'::regclass);


--
-- Name: group_post_media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_post_media ALTER COLUMN id SET DEFAULT nextval('public.group_post_media_id_seq'::regclass);


--
-- Name: group_posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_posts ALTER COLUMN id SET DEFAULT nextval('public.group_posts_id_seq'::regclass);


--
-- Name: group_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes ALTER COLUMN id SET DEFAULT nextval('public.group_votes_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: helpful_marks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpful_marks ALTER COLUMN id SET DEFAULT nextval('public.helpful_marks_id_seq'::regclass);


--
-- Name: location_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_history ALTER COLUMN id SET DEFAULT nextval('public.location_history_id_seq'::regclass);


--
-- Name: media id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media ALTER COLUMN id SET DEFAULT nextval('public.media_id_seq'::regclass);


--
-- Name: message_reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions ALTER COLUMN id SET DEFAULT nextval('public.message_reactions_id_seq'::regclass);


--
-- Name: message_reads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads ALTER COLUMN id SET DEFAULT nextval('public.message_reads_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: nearby_search_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nearby_search_cache ALTER COLUMN id SET DEFAULT nextval('public.nearby_search_cache_id_seq'::regclass);


--
-- Name: notification_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_batches ALTER COLUMN id SET DEFAULT nextval('public.notification_batches_id_seq'::regclass);


--
-- Name: notification_preferences id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences ALTER COLUMN id SET DEFAULT nextval('public.notification_preferences_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: poll_options id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_options ALTER COLUMN id SET DEFAULT nextval('public.poll_options_id_seq'::regclass);


--
-- Name: poll_votes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes ALTER COLUMN id SET DEFAULT nextval('public.poll_votes_id_seq'::regclass);


--
-- Name: posts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts ALTER COLUMN id SET DEFAULT nextval('public.posts_id_seq'::regclass);


--
-- Name: rating_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_reports ALTER COLUMN id SET DEFAULT nextval('public.rating_reports_id_seq'::regclass);


--
-- Name: reactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions ALTER COLUMN id SET DEFAULT nextval('public.reactions_id_seq'::regclass);


--
-- Name: shares id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shares ALTER COLUMN id SET DEFAULT nextval('public.shares_id_seq'::regclass);


--
-- Name: timeline_cache id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_cache ALTER COLUMN id SET DEFAULT nextval('public.timeline_cache_id_seq'::regclass);


--
-- Name: typing_indicators id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators ALTER COLUMN id SET DEFAULT nextval('public.typing_indicators_id_seq'::regclass);


--
-- Name: user_ratings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ratings ALTER COLUMN id SET DEFAULT nextval('public.user_ratings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: comment_interactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment_interactions (id, comment_id, interaction_type, user_id, session_id, ip_address, user_agent, created_at, metadata) FROM stdin;
\.


--
-- Data for Name: comment_metrics; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comment_metrics (comment_id, view_count, unique_view_count, reply_count, reaction_count, share_count, deep_read_count, total_interaction_count, recency_score, interaction_rate, engagement_score, combined_algorithm_score, first_interaction_at, last_interaction_at, peak_interaction_period, created_at, last_updated) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.comments (id, user_id, post_id, parent_id, content, is_published, depth, created_at, updated_at) FROM stdin;
92	17	17	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-25 06:11:09.52	2025-09-29 02:47:48.264
93	18	17	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-22 16:33:54.904	2025-09-29 02:47:48.268
94	14	17	\N	Clean Code is a classic! Robert Martin's principles are timeless.	t	0	2025-09-16 01:30:36.09	2025-09-29 02:47:48.271
95	20	18	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-05 03:22:28.454	2025-09-29 02:47:48.275
96	20	18	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-09-25 12:36:14.461	2025-09-29 02:47:48.28
97	20	18	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-06 08:53:31.806	2025-09-29 02:47:48.284
98	19	19	\N	Great work! I love seeing the progress in the React community.	t	0	2025-09-14 12:03:38.364	2025-09-29 02:47:48.288
99	21	19	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-11 13:30:26.76	2025-09-29 02:47:48.292
100	14	19	\N	Machine learning is like modern magic! Python makes it so accessible.	t	0	2025-09-11 17:21:03.925	2025-09-29 02:47:48.296
101	14	20	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-11 21:26:13.649	2025-09-29 02:47:48.3
102	21	21	\N	TypeScript definitely has a learning curve, but it's worth it! Try starting with basic types.	t	0	2025-09-21 11:42:43.286	2025-09-29 02:47:48.305
103	15	21	\N	That sounds like an awesome project! I'd love to contribute.	t	0	2025-09-03 18:25:28.221	2025-09-29 02:47:48.309
104	21	21	\N	Docker orchestration can be tricky. Kubernetes might be your next step!	t	0	2025-09-20 06:54:45.153	2025-09-29 02:47:48.313
105	15	22	\N	WebAssembly is fascinating! The performance gains are incredible.	t	0	2025-09-10 20:01:17.339	2025-09-29 02:47:48.317
106	20	22	\N	Great work! I love seeing the progress in the React community.	t	0	2025-08-30 06:12:40.855	2025-09-29 02:47:48.32
107	14	22	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-19 04:06:24.161	2025-09-29 02:47:48.323
108	12	23	\N	Great work! I love seeing the progress in the React community.	t	0	2025-09-28 09:42:23.06	2025-09-29 02:47:48.326
109	20	23	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-15 08:00:03.721	2025-09-29 02:47:48.329
110	20	23	\N	WebAssembly is fascinating! The performance gains are incredible.	t	0	2025-09-21 02:05:21.974	2025-09-29 02:47:48.332
111	20	24	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-03 03:45:23.966	2025-09-29 02:47:48.336
112	19	24	\N	Legacy code refactoring is both painful and satisfying. You're doing great work!	t	0	2025-09-24 12:48:04.578	2025-09-29 02:47:48.34
113	19	24	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-08-30 04:24:39.291	2025-09-29 02:47:48.344
114	19	24	\N	Machine learning is like modern magic! Python makes it so accessible.	t	0	2025-09-05 17:11:22.559	2025-09-29 02:47:48.348
115	17	25	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-02 03:47:43.716	2025-09-29 02:47:48.351
116	17	25	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-16 18:07:04.278	2025-09-29 02:47:48.355
117	15	25	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-04 20:38:41.271	2025-09-29 02:47:48.359
118	16	26	\N	Security is so important. What tools do you recommend for penetration testing?	t	0	2025-08-30 12:11:53.32	2025-09-29 02:47:48.364
119	14	26	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-04 15:42:13.716	2025-09-29 02:47:48.369
120	13	26	\N	Security is so important. What tools do you recommend for penetration testing?	t	0	2025-09-16 10:52:42.163	2025-09-29 02:47:48.373
121	15	27	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-09-27 02:53:46.436	2025-09-29 02:47:48.378
122	19	27	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-07 15:53:20.22	2025-09-29 02:47:48.382
123	12	28	\N	Hackathons are exhausting but so much fun! What tech stack did you use?	t	0	2025-09-19 21:40:17.863	2025-09-29 02:47:48.386
124	19	28	\N	Which conference was this? I'm always looking for good tech events.	t	0	2025-09-10 00:34:16.508	2025-09-29 02:47:48.389
125	21	28	\N	CSS Grid is amazing! I still use flexbox for smaller components though.	t	0	2025-09-16 02:06:32.013	2025-09-29 02:47:48.393
126	18	28	\N	Clean Code is a classic! Robert Martin's principles are timeless.	t	0	2025-09-28 18:04:21.226	2025-09-29 02:47:48.398
127	14	29	\N	Design systems are crucial for consistency. Have you looked into Figma tokens?	t	0	2025-09-15 19:11:35.268	2025-09-29 02:47:48.401
128	19	29	\N	Legacy code refactoring is both painful and satisfying. You're doing great work!	t	0	2025-09-21 14:11:11.713	2025-09-29 02:47:48.405
129	12	30	\N	TypeScript definitely has a learning curve, but it's worth it! Try starting with basic types.	t	0	2025-09-06 08:06:30.056	2025-09-29 02:47:48.408
130	20	31	\N	Those late night debugging sessions hit different! Coffee is definitely essential.	t	0	2025-09-02 12:08:07.118	2025-09-29 02:47:48.411
131	16	31	\N	Those late night debugging sessions hit different! Coffee is definitely essential.	t	0	2025-09-06 09:39:42.141	2025-09-29 02:47:48.415
132	12	31	\N	Game development is so rewarding! Are you using any specific frameworks?	t	0	2025-09-26 03:39:15.657	2025-09-29 02:47:48.418
133	12	21	104	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-08 08:18:20.827	2025-09-29 02:47:48.425
134	15	26	118	I'm using Unity for now, but considering building something from scratch.	t	0	2025-08-30 11:48:47.616	2025-09-29 02:47:48.433
135	18	26	118	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-22 00:23:23.206	2025-09-29 02:47:48.438
136	12	17	94	Thanks! React hooks really changed the game for me.	t	0	2025-09-06 03:38:02.439	2025-09-29 02:47:48.445
137	17	29	127	Python's libraries make everything so much easier to get started.	t	0	2025-09-12 07:03:56.406	2025-09-29 02:47:48.452
138	16	29	127	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-09-10 21:04:55.304	2025-09-29 02:47:48.458
139	13	29	127	Thanks! React hooks really changed the game for me.	t	0	2025-09-05 01:14:50.392	2025-09-29 02:47:48.463
140	20	17	93	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-17 04:17:27.85	2025-09-29 02:47:48.47
141	16	17	93	Python's libraries make everything so much easier to get started.	t	0	2025-09-19 06:37:17.724	2025-09-29 02:47:48.475
142	12	30	129	I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.	t	0	2025-09-25 14:47:00.132	2025-09-29 02:47:48.481
143	17	31	130	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-08-31 18:22:00.407	2025-09-29 02:47:48.488
144	15	31	130	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-09 19:14:54.673	2025-09-29 02:47:48.492
145	13	27	121	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-08-31 23:32:57.176	2025-09-29 02:47:48.497
146	14	28	126	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-09-23 03:39:08.018	2025-09-29 02:47:48.502
147	12	28	126	His naming conventions chapter changed how I think about code.	t	0	2025-09-05 04:05:58.41	2025-09-29 02:47:48.507
148	18	28	126	The integration with existing codebases is surprisingly smooth!	t	0	2025-09-11 17:24:51.463	2025-09-29 02:47:48.514
149	17	23	110	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-23 08:12:12.298	2025-09-29 02:47:48.518
150	12	23	110	Thanks! React hooks really changed the game for me.	t	0	2025-09-11 10:39:24.399	2025-09-29 02:47:48.523
151	18	26	120	Thanks! React hooks really changed the game for me.	t	0	2025-09-12 04:19:10.138	2025-09-29 02:47:48.527
152	12	26	120	We used Node.js, React, and Socket.io. Classic but effective stack!	t	0	2025-09-09 22:48:12.66	2025-09-29 02:47:48.533
153	14	26	120	His naming conventions chapter changed how I think about code.	t	0	2025-09-09 21:24:56.335	2025-09-29 02:47:48.539
154	16	19	99	I'm using Unity for now, but considering building something from scratch.	t	0	2025-09-02 01:16:13.863	2025-09-29 02:47:48.543
155	20	19	99	Python's libraries make everything so much easier to get started.	t	0	2025-09-25 00:12:25.581	2025-09-29 02:47:48.547
156	12	19	99	I'd love to collaborate! GitHub integration would be key.	t	0	2025-09-03 08:59:10.424	2025-09-29 02:47:48.552
157	21	23	108	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-09-19 10:34:56.376	2025-09-29 02:47:48.558
158	13	23	108	Kubernetes is definitely on my learning list. Any good resources?	t	0	2025-08-30 22:27:37.726	2025-09-29 02:47:48.565
159	20	23	108	Thanks! React hooks really changed the game for me.	t	0	2025-09-03 00:32:41.198	2025-09-29 02:47:48.57
160	16	28	125	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-08 11:13:57.753	2025-09-29 02:47:48.574
161	17	31	132	We used Node.js, React, and Socket.io. Classic but effective stack!	t	0	2025-09-14 11:10:43.346	2025-09-29 02:47:48.579
162	21	29	128	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-02 01:27:08.87	2025-09-29 02:47:48.584
163	18	29	128	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-09-28 14:55:17.027	2025-09-29 02:47:48.588
164	18	24	112	His naming conventions chapter changed how I think about code.	t	0	2025-09-01 06:58:18.137	2025-09-29 02:47:48.593
165	15	24	112	I'd love to collaborate! GitHub integration would be key.	t	0	2025-09-13 12:02:38.07	2025-09-29 02:47:48.597
166	13	24	112	The integration with existing codebases is surprisingly smooth!	t	0	2025-09-04 22:10:19.923	2025-09-29 02:47:48.601
167	15	18	97	The coffee to code ratio is crucial for late night sessions 😄	t	0	2025-09-08 15:38:22.126	2025-09-29 02:47:48.606
168	20	18	97	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-17 02:45:49.216	2025-09-29 02:47:48.611
169	19	18	97	Thanks! React hooks really changed the game for me.	t	0	2025-09-18 17:45:16.485	2025-09-29 02:47:48.615
170	19	18	96	Python's libraries make everything so much easier to get started.	t	0	2025-09-24 09:15:48.899	2025-09-29 02:47:48.619
171	16	18	96	I'll definitely check out Figma tokens. Thanks for the suggestion!	t	0	2025-09-04 09:40:36.042	2025-09-29 02:47:48.624
172	18	18	96	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-09-05 17:22:48.631	2025-09-29 02:47:48.628
173	20	20	101	The archaeological analogy is perfect! Old code tells stories.	t	0	2025-09-01 13:26:29.603	2025-09-29 02:47:48.632
174	16	25	117	I'd love to collaborate! GitHub integration would be key.	t	0	2025-09-19 09:25:01.618	2025-09-29 02:47:48.636
175	21	25	117	We used Node.js, React, and Socket.io. Classic but effective stack!	t	0	2025-09-08 23:25:03.262	2025-09-29 02:47:48.641
176	16	25	117	Kubernetes is definitely on my learning list. Any good resources?	t	0	2025-09-18 12:03:33.932	2025-09-29 02:47:48.647
177	14	24	113	I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.	t	0	2025-09-27 20:02:17.355	2025-09-29 02:47:48.652
178	16	24	113	It was TechCrunch Disrupt. Highly recommend it!	t	0	2025-08-30 13:23:16.916	2025-09-29 02:47:48.657
179	15	28	124	I use OWASP ZAP and Burp Suite mostly. Both are excellent tools.	t	0	2025-09-22 10:06:29.069	2025-09-29 02:47:48.661
180	20	24	114	His naming conventions chapter changed how I think about code.	t	0	2025-09-08 23:13:49.73	2025-09-29 02:47:48.665
181	13	24	\N	This looks absolutely amazing! Game development is such a fascinating field. What programming language are you using for this?	t	0	2025-09-29 15:35:57.122	2025-09-29 15:35:57.122
182	15	24	\N	Physics engines are incredibly complex. Have you considered using an existing one like Box2D or are you building from scratch?	t	0	2025-09-29 15:35:57.137	2025-09-29 15:35:57.137
183	17	24	\N	The game development community is so supportive! I would love to see some screenshots or a demo when you have something to share.	t	0	2025-09-29 15:35:57.139	2025-09-29 15:35:57.139
184	19	24	\N	I have been thinking about getting into game development myself. Any advice for someone just starting out?	t	0	2025-09-29 15:35:57.142	2025-09-29 15:35:57.142
185	14	24	\N	This is inspiring! I remember trying to make a simple platformer and getting stuck on collision detection. Physics is definitely the hard part.	t	0	2025-09-29 15:35:57.145	2025-09-29 15:35:57.145
186	16	24	\N	Are you planning to release this as open source? The game dev community could really benefit from seeing how you tackle the physics calculations.	t	0	2025-09-29 15:35:57.148	2025-09-29 15:35:57.148
187	18	24	\N	What kind of game are you building? 2D or 3D? The physics requirements are quite different for each.	t	0	2025-09-29 15:35:57.15	2025-09-29 15:35:57.15
188	20	24	\N	Game engines are such a rabbit hole! I started working on one for learning purposes and ended up spending months just on the renderer.	t	0	2025-09-29 15:35:57.153	2025-09-29 15:35:57.153
189	16	24	178	I agree! TechCrunch Disrupt was amazing. Did you attend the AI sessions?	t	0	2025-10-01 03:02:43.545	2025-10-01 03:02:43.545
190	17	24	189	Yes! The AI panel was incredible. GPT-4 demos blew my mind!	t	0	2025-10-01 03:02:43.55	2025-10-01 03:02:43.55
\.


--
-- Data for Name: conversation_participants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversation_participants (id, conversation_id, user_id, joined_at, left_at, role, muted, archived, last_read_at) FROM stdin;
1	1	22	2025-10-28 11:28:35.636	\N	member	f	f	\N
2	1	12	2025-10-28 11:28:35.636	\N	member	f	f	\N
3	2	22	2025-10-28 11:36:56.465	\N	member	f	f	\N
4	2	14	2025-10-28 11:36:56.465	\N	member	f	f	\N
5	3	22	2025-10-28 11:36:56.465	\N	member	f	f	\N
6	3	14	2025-10-28 11:36:56.465	\N	member	f	f	\N
7	4	30	2025-10-30 09:55:07.463	\N	member	f	f	\N
8	4	31	2025-10-30 09:55:07.468	\N	member	f	f	\N
9	4	32	2025-10-30 09:55:07.472	\N	member	f	f	\N
10	4	33	2025-10-30 09:55:07.475	\N	member	f	f	\N
11	4	39	2025-10-30 09:55:07.479	\N	member	f	f	\N
\.


--
-- Data for Name: conversations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.conversations (id, type, title, created_by, created_at, updated_at, last_message_id, group_id) FROM stdin;
1	direct	\N	22	2025-10-28 11:28:35.636	2025-10-28 11:28:35.636	\N	\N
2	direct	\N	22	2025-10-28 11:36:56.465	2025-10-28 11:36:56.465	\N	\N
3	direct	\N	22	2025-10-28 11:36:56.465	2025-10-28 11:36:56.465	\N	\N
4	group	Tech Community Chat	30	2025-10-30 09:55:07.438	2025-10-30 22:14:50.843	2	6
\.


--
-- Data for Name: follows; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follows (id, follower_id, following_id, status, notifications_enabled, created_at, updated_at) FROM stdin;
7	22	14	active	t	2025-10-03 22:26:42.811	2025-10-03 22:26:42.811
\.


--
-- Data for Name: group_activity_log; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_activity_log (id, group_id, user_id, action_type, target_type, target_id, details, created_at) FROM stdin;
\.


--
-- Data for Name: group_comment_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_comment_media (id, comment_id, file_name, file_path, file_url, file_type, file_size, mime_type, media_type, width, height, duration, thumbnail_url, display_order, uploaded_at) FROM stdin;
\.


--
-- Data for Name: group_comments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_comments (id, post_id, parent_id, user_id, content, status, removed_by, removed_at, removal_reason, upvotes, downvotes, score, depth, path, created_at, updated_at, edited_at) FROM stdin;
\.


--
-- Data for Name: group_invitations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_invitations (id, group_id, inviter_id, invitee_id, invitee_email, status, token, expires_at, created_at, responded_at) FROM stdin;
\.


--
-- Data for Name: group_memberships; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_memberships (id, group_id, user_id, role, status, joined_at, invited_by, banned_by, banned_reason, banned_at) FROM stdin;
\.


--
-- Data for Name: group_post_media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_post_media (id, post_id, file_name, file_path, file_url, file_type, file_size, mime_type, media_type, width, height, duration, thumbnail_url, display_order, uploaded_at) FROM stdin;
\.


--
-- Data for Name: group_posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_posts (id, group_id, user_id, title, content, post_type, link_url, link_title, link_description, link_thumbnail, status, approved_by, approved_at, removed_by, removed_at, removal_reason, upvotes, downvotes, score, comment_count, is_pinned, is_locked, is_nsfw, is_spoiler, created_at, updated_at, edited_at, poll_question, poll_ends_at, poll_allow_multiple, poll_total_votes) FROM stdin;
\.


--
-- Data for Name: group_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.group_votes (id, user_id, post_id, comment_id, vote_type, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.groups (id, name, slug, display_name, description, avatar_url, banner_url, visibility, require_approval, allow_posts, post_approval_required, allow_multimedia, allowed_media_types, max_file_size_mb, creator_id, member_count, post_count, created_at, updated_at, settings, allow_public_posting, location_restricted, location_type, location_latitude, location_longitude, location_radius_km, location_country, location_state, location_city, location_polygon, location_name, moderator_can_remove_posts, moderator_can_remove_comments, moderator_can_ban_members, moderator_can_approve_posts, moderator_can_approve_members, moderator_can_pin_posts, moderator_can_lock_posts, allow_text_posts, allow_link_posts, allow_image_posts, allow_video_posts, allow_poll_posts, rules, conversation_id) FROM stdin;
\.


--
-- Data for Name: helpful_marks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.helpful_marks (id, user_id, target_type, target_id, created_at) FROM stdin;
\.


--
-- Data for Name: location_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.location_history (id, user_id, location_latitude, location_longitude, location_city, location_state, location_country, accuracy, ip_address, user_agent, created_at) FROM stdin;
1	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 11:23:38.004
2	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 12:04:25.902
3	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 22:43:50.214
4	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 22:43:53.058
5	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 22:54:47.277
6	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 22:56:26.992
7	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:06:24.864
8	22	33.9181568	-117.2733952	\N	\N	\N	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-07 23:07:18.351
9	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:14:51.673
10	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:15:44.267
11	22	34.0522000	-118.2437000	Los Angeles	California	United States	50	127.0.0.1	test	2025-10-08 00:15:47.68
12	22	33.9181568	-117.2733952	Moreno Valley	California	United States	1865	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-08 00:16:02.003
13	22	0.0000000	0.0000000	Riverside	CA	United States	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-09 03:43:42.7
14	22	0.0000000	0.0000000	Riverside	CA	United States	\N	::1	Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36	2025-10-13 22:00:01.885
\.


--
-- Data for Name: media; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.media (id, user_id, post_id, comment_id, filename, original_name, file_path, file_url, mime_type, file_size, media_type, width, height, duration, alt_text, is_processed, thumbnail_path, thumbnail_url, created_at, updated_at) FROM stdin;
1	22	32	\N	sample1.jpg	sample1.jpg	images/sample1.jpg	/uploads/images/sample1.jpg	image/jpeg	20000	image	800	600	\N	Sample Red Image	f	\N	\N	2025-10-02 10:37:29.272	2025-10-02 10:37:29.272
2	22	32	\N	sample2.jpg	sample2.jpg	images/sample2.jpg	/uploads/images/sample2.jpg	image/jpeg	20000	image	800	600	\N	Sample Teal Image	f	\N	\N	2025-10-02 10:37:29.276	2025-10-02 10:37:29.276
3	22	32	\N	sample3.jpg	sample3.jpg	images/sample3.jpg	/uploads/images/sample3.jpg	image/jpeg	20000	image	800	600	\N	Sample Blue Image	f	\N	\N	2025-10-02 10:37:29.278	2025-10-02 10:37:29.278
4	22	32	\N	sample4.jpg	sample4.jpg	images/sample4.jpg	/uploads/images/sample4.jpg	image/jpeg	20000	image	800	600	\N	Sample Orange Image	f	\N	\N	2025-10-02 10:37:29.281	2025-10-02 10:37:29.281
5	22	33	\N	d3e26f97-c326-4b27-a545-93afb526f731.jpg	lovebird.jpg	images/d3e26f97-c326-4b27-a545-93afb526f731.jpg	/uploads/images/d3e26f97-c326-4b27-a545-93afb526f731.jpg	image/jpeg	4401263	image	5184	3456	\N	\N	f	\N	\N	2025-10-02 03:39:14.764	2025-10-02 03:39:14.764
6	22	34	\N	a2d8e01f-38df-478a-8771-868fdad9d71a.jpg	lovebird.jpg	images/a2d8e01f-38df-478a-8771-868fdad9d71a.jpg	/uploads/images/a2d8e01f-38df-478a-8771-868fdad9d71a.jpg	image/jpeg	4401263	image	5184	3456	\N	\N	f	\N	\N	2025-10-07 15:41:03.109	2025-10-07 15:41:03.109
\.


--
-- Data for Name: message_reactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_reactions (id, message_id, user_id, emoji, created_at) FROM stdin;
\.


--
-- Data for Name: message_reads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.message_reads (id, message_id, user_id, read_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.messages (id, conversation_id, sender_id, content, message_type, attachment_url, attachment_type, attachment_size, attachment_name, reply_to_id, edited_at, deleted_at, created_at) FROM stdin;
1	4	30	testing	text	\N	\N	\N	\N	\N	\N	\N	2025-10-30 22:09:29.908
2	4	30	test message	text	\N	\N	\N	\N	\N	\N	\N	2025-10-30 22:14:50.843
\.


--
-- Data for Name: nearby_search_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.nearby_search_cache (id, user_id, search_lat, search_lon, radius_miles, nearby_user_ids, result_count, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: notification_batches; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_batches (id, user_id, type, entity_type, entity_id, count, last_actor_id, sample_actor_ids, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notification_preferences; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notification_preferences (id, user_id, notification_type, email_enabled, push_enabled, in_app_enabled, frequency, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, user_id, type, title, message, actor_id, entity_type, entity_id, action_url, priority, read_at, clicked_at, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: poll_options; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.poll_options (id, post_id, option_text, option_order, vote_count, created_at) FROM stdin;
\.


--
-- Data for Name: poll_votes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.poll_votes (id, post_id, option_id, user_id, created_at) FROM stdin;
\.


--
-- Data for Name: posts; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.posts (id, user_id, content, privacy_level, is_published, is_archived, views_count, scheduled_for, created_at, updated_at, deleted_at, deleted_by, deletion_reason) FROM stdin;
17	18	Just finished building my first React application! 🚀 The component lifecycle still amazes me. Anyone else find useState hooks as elegant as I do?	public	t	f	0	\N	2025-09-08 21:50:54.045	2025-09-29 02:47:48.224	\N	\N	\N
18	20	Been diving deep into TypeScript lately. The type safety is incredible, but the learning curve is steep! Any tips for someone transitioning from vanilla JS?	public	t	f	0	\N	2025-09-04 00:49:10.738	2025-09-29 02:47:48.226	\N	\N	\N
19	12	Working on a new design system for our team. Color theory is more complex than I initially thought! 🎨 What are your favorite design tools?	public	t	f	0	\N	2025-09-23 04:35:21.035	2025-09-29 02:47:48.229	\N	\N	\N
20	12	Just deployed my first microservice architecture. Docker containers everywhere! 🐳 The orchestration is beautiful when it all comes together.	public	t	f	0	\N	2025-09-04 08:23:47.562	2025-09-29 02:47:48.231	\N	\N	\N
21	21	Late night coding session debugging a memory leak. Sometimes the best solutions come at 2 AM with a cup of coffee ☕	friends	t	f	0	\N	2025-08-30 10:56:47.431	2025-09-29 02:47:48.234	\N	\N	\N
22	16	Attended an amazing tech conference today! The keynote on AI ethics really made me think about our responsibility as developers.	public	t	f	0	\N	2025-09-01 19:32:59.119	2025-09-29 02:47:48.236	\N	\N	\N
23	12	Finally mastered CSS Grid after years of flexbox! The layout possibilities are endless. Who else is team Grid over Flexbox?	public	t	f	0	\N	2025-08-30 07:07:21.052	2025-09-29 02:47:48.238	\N	\N	\N
24	14	Working on a game engine in my spare time. Physics calculations are harder than I expected, but so rewarding when they work! 🎮	public	t	f	0	\N	2025-09-18 12:58:18.909	2025-09-29 02:47:48.241	\N	\N	\N
25	15	Penetration testing results came back clean! 🔐 Always satisfying when security measures hold up under scrutiny.	friends	t	f	0	\N	2025-09-07 15:01:29.377	2025-09-29 02:47:48.243	\N	\N	\N
26	13	Experimenting with WebAssembly for performance-critical applications. The speed improvements are incredible! Anyone else exploring WASM?	public	t	f	0	\N	2025-08-31 13:40:13.673	2025-09-29 02:47:48.246	\N	\N	\N
27	20	Teaching myself Machine Learning with Python. Neural networks are like magic, but with math! 🧠✨	public	t	f	0	\N	2025-09-15 00:51:59.381	2025-09-29 02:47:48.249	\N	\N	\N
28	16	Refactored 500 lines of legacy code today. It's like archaeology, but with more semicolons. The satisfaction is real though!	public	t	f	0	\N	2025-09-10 12:23:23.082	2025-09-29 02:47:48.253	\N	\N	\N
29	14	New project idea: A collaborative platform for developers to share code snippets. Think GitHub meets StackOverflow. Thoughts?	public	t	f	0	\N	2025-09-02 08:25:44.952	2025-09-29 02:47:48.255	\N	\N	\N
30	13	Just finished reading 'Clean Code' by Robert Martin. My variable naming will never be the same! 📚	public	t	f	0	\N	2025-09-11 01:01:36.595	2025-09-29 02:47:48.258	\N	\N	\N
31	18	Weekend hackathon was intense! Built a real-time chat app with WebSockets. Sleep is overrated anyway... 😴	public	t	f	0	\N	2025-09-13 11:24:27.106	2025-09-29 02:47:48.261	\N	\N	\N
32	22	Testing multi-media support! 📸 Here are some beautiful sample images to showcase the new media gallery feature.	public	t	f	0	\N	2025-10-02 10:37:29.268	2025-10-02 10:37:29.268	\N	\N	\N
33	22	sdfsf	public	t	f	0	\N	2025-10-02 03:39:13.297	2025-10-02 03:39:13.297	\N	\N	\N
34	22	sample psot	public	t	f	0	\N	2025-10-07 15:41:01.506	2025-10-07 15:41:01.506	\N	\N	\N
\.


--
-- Data for Name: rating_reports; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rating_reports (id, rating_id, reporter_id, report_reason, report_details, status, reviewed_by, reviewed_at, resolution_notes, created_at) FROM stdin;
\.


--
-- Data for Name: reactions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.reactions (id, user_id, post_id, comment_id, emoji_name, emoji_unicode, created_at, updated_at) FROM stdin;
77	20	17	\N	thumbs_down	👎	2025-08-31 05:34:13.455	2025-09-29 02:47:48.668
78	16	17	\N	angry	😡	2025-09-03 04:41:01.092	2025-10-08 23:01:22.432
79	15	17	\N	laugh	😂	2025-09-13 09:02:49.167	2025-10-08 23:01:22.432
80	14	17	\N	wow	😮	2025-09-14 11:26:48.63	2025-10-08 23:01:22.432
81	17	17	\N	100	💯	2025-09-13 21:49:24.23	2025-09-29 02:47:48.683
82	19	17	\N	love	❤️	2025-09-17 12:24:37.502	2025-10-08 23:01:22.432
83	13	18	\N	like	👏	2025-09-10 02:02:11.332	2025-10-08 23:01:22.432
84	19	19	\N	like	👏	2025-09-03 21:19:29.843	2025-10-08 23:01:22.432
85	16	19	\N	tada	🎉	2025-09-25 17:39:08.915	2025-09-29 02:47:48.698
86	15	19	\N	thumbs_down	👎	2025-09-09 22:36:45.603	2025-09-29 02:47:48.702
87	21	19	\N	wow	😮	2025-09-11 10:04:59.283	2025-10-08 23:01:22.432
88	17	19	\N	wow	😮	2025-09-14 09:58:19.869	2025-10-08 23:01:22.432
89	14	19	\N	fire	🔥	2025-09-06 23:30:07.802	2025-09-29 02:47:48.714
90	15	20	\N	like	🤔	2025-09-06 15:24:37.918	2025-10-08 23:01:22.432
91	19	20	\N	wow	😮	2025-09-17 16:48:31.643	2025-10-08 23:01:22.432
92	14	20	\N	fire	🔥	2025-09-20 19:30:06.119	2025-09-29 02:47:48.724
93	13	20	\N	tada	🎉	2025-09-10 13:33:20.206	2025-09-29 02:47:48.727
94	17	20	\N	sad	😢	2025-09-22 11:12:47.322	2025-10-08 23:01:22.432
95	15	21	\N	100	💯	2025-08-30 17:09:20.238	2025-09-29 02:47:48.734
96	13	21	\N	thumbs_down	👎	2025-09-01 15:16:49.749	2025-09-29 02:47:48.738
97	16	21	\N	thumbs_down	👎	2025-09-14 07:09:17.932	2025-09-29 02:47:48.741
98	14	21	\N	angry	😡	2025-09-03 14:12:58.096	2025-10-08 23:01:22.432
99	12	22	\N	wow	😮	2025-09-07 12:55:52.029	2025-10-08 23:01:22.432
100	15	22	\N	laugh	😂	2025-09-02 16:18:14.989	2025-10-08 23:01:22.432
101	15	23	\N	laugh	😂	2025-09-13 13:20:45.293	2025-10-08 23:01:22.432
102	19	23	\N	wow	😮	2025-09-02 06:01:19.508	2025-10-08 23:01:22.432
103	13	23	\N	fire	🔥	2025-09-16 17:35:49.19	2025-09-29 02:47:48.761
104	21	23	\N	laugh	😂	2025-09-12 05:44:28.137	2025-10-08 23:01:22.432
105	18	23	\N	thumbs_down	👎	2025-09-24 15:50:53.518	2025-09-29 02:47:48.769
106	15	24	\N	wow	😮	2025-09-05 20:46:41.819	2025-10-08 23:01:22.432
107	19	24	\N	thumbs_down	👎	2025-09-18 01:19:26.062	2025-09-29 02:47:48.777
108	18	25	\N	wow	😮	2025-09-02 08:07:34.114	2025-10-08 23:01:22.432
109	13	25	\N	100	💯	2025-09-11 17:12:48.773	2025-09-29 02:47:48.784
110	12	25	\N	like	👏	2025-09-24 13:10:47.896	2025-10-08 23:01:22.432
111	15	26	\N	like	👍	2025-09-04 05:46:26.971	2025-10-08 23:01:22.432
112	12	27	\N	angry	😡	2025-09-11 00:06:46.287	2025-10-08 23:01:22.432
113	18	27	\N	laugh	😂	2025-09-23 15:36:57.945	2025-10-08 23:01:22.432
114	13	27	\N	wow	😮	2025-09-13 10:38:21.885	2025-10-08 23:01:22.432
115	15	28	\N	like	🤔	2025-09-26 18:34:54.667	2025-10-08 23:01:22.432
116	19	28	\N	sad	😢	2025-09-17 20:57:50.769	2025-10-08 23:01:22.432
117	12	28	\N	100	💯	2025-09-04 10:02:38.746	2025-09-29 02:47:48.812
118	17	28	\N	thumbs_down	👎	2025-09-03 02:24:27.255	2025-09-29 02:47:48.816
119	14	28	\N	angry	😡	2025-09-17 04:57:11.091	2025-10-08 23:01:22.432
120	18	28	\N	tada	🎉	2025-09-27 06:49:57.363	2025-09-29 02:47:48.825
121	16	29	\N	tada	🎉	2025-09-18 04:58:52.581	2025-09-29 02:47:48.829
122	12	30	\N	tada	🎉	2025-09-16 01:38:56.305	2025-09-29 02:47:48.832
123	13	30	\N	angry	😡	2025-09-23 01:33:46.291	2025-10-08 23:01:22.432
124	19	30	\N	wow	😮	2025-09-07 15:45:12.401	2025-10-08 23:01:22.432
125	14	30	\N	thumbs_down	👎	2025-08-30 14:59:36.515	2025-09-29 02:47:48.843
126	21	30	\N	fire	🔥	2025-09-11 20:08:28.191	2025-09-29 02:47:48.847
127	20	31	\N	like	👍	2025-09-23 05:05:10.972	2025-10-08 23:01:22.432
128	13	31	\N	fire	🔥	2025-09-23 08:38:15.802	2025-09-29 02:47:48.854
129	14	31	\N	wow	😮	2025-09-16 23:48:31.785	2025-10-08 23:01:22.432
130	16	31	\N	wow	😮	2025-09-17 07:26:41.194	2025-10-08 23:01:22.432
131	21	31	\N	love	❤️	2025-09-26 02:12:55.528	2025-10-08 23:01:22.432
133	22	24	\N	like	👍	2025-10-03 15:27:04.197	2025-10-08 22:40:32.707
135	22	19	\N	sad	😢	2025-10-08 15:31:24.328	2025-10-08 23:02:28.747
136	22	28	\N	like	👍	2025-10-08 15:41:25.849	2025-10-08 23:01:22.432
137	22	33	\N	clap	👍	2025-10-08 15:42:15.886	2025-10-08 23:02:22.894
140	22	32	\N	love	❤️	2025-10-08 15:54:28.838	2025-10-08 23:04:40.973
141	22	34	\N	angry	😠	2025-10-08 15:58:24.991	2025-10-13 21:55:46.929
142	22	30	\N	thinking	👍	2025-10-08 16:03:52.227	2025-10-08 23:03:58.505
\.


--
-- Data for Name: shares; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.shares (id, user_id, post_id, share_type, share_comment, visibility, created_at) FROM stdin;
1	22	24	repost	\N	public	2025-10-03 22:51:32.84
\.


--
-- Data for Name: timeline_cache; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.timeline_cache (id, user_id, post_id, score, reason, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: typing_indicators; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.typing_indicators (id, conversation_id, user_id, started_at, expires_at) FROM stdin;
\.


--
-- Data for Name: user_ratings; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_ratings (id, rater_id, rated_user_id, rating_type, rating_value, context_type, context_id, review_text, is_anonymous, is_verified, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_reputation; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_reputation (user_id, total_ratings_received, average_rating, rating_distribution, reputation_score, reputation_level, post_rating_avg, comment_rating_avg, interaction_rating_avg, verified_ratings_count, positive_ratings_count, neutral_ratings_count, negative_ratings_count, helpful_count, reported_count, quality_posts_count, quality_comments_count, badges, achievements, first_rating_at, last_rating_at, reputation_peak, reputation_peak_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_stats; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_stats (user_id, follower_count, following_count, post_count, total_reactions_received, total_shares_received, total_comments_received, engagement_score, last_post_at, updated_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, username, email, password_hash, first_name, last_name, bio, avatar_url, is_active, email_verified, email_verification_token, password_reset_token, password_reset_expires, last_login, created_at, updated_at, location_latitude, location_longitude, location_city, location_state, location_country, location_updated_at, location_accuracy, location_sharing, show_distance_in_profile, address, location_zip, banner_url, website, twitter_handle, linkedin_url, github_username, job_title, company, tagline, profile_visibility, hobbies, skills, favorite_pets, expertise) FROM stdin;
12	alice_wonder	alice@example.com	$2a$12$bnH8x3jGGFkMjfFypDPeFuh951gdo993F0SJNwUjYmQeFLy0ILM2K	Alice	Wonderland	Curious explorer of digital realms	/uploads/avatars/user_12_i1thuejz4h9.png	t	f	\N	\N	\N	\N	2025-09-19 21:21:28.18	2025-10-06 21:54:52.091	37.7749295	-122.4194155	San Francisco	California	United States	2025-10-06 21:54:52.091	\N	city	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
13	bob_builder	bob@example.com	$2a$12$p/GnRBxXpl9Wbe42TJpdXOoo503GNYxqKAPGQzWnOL0vhvsETNWem	Bob	Builder	Building amazing things, one line of code at a time	/uploads/avatars/user_13_15zu1l8pjtk.png	t	f	\N	\N	\N	\N	2025-09-26 13:47:42.133	2025-10-06 21:54:52.101	30.2672000	-97.7431000	Austin	Texas	United States	2025-10-06 21:54:52.101	\N	exact	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
14	charlie_dev	charlie@example.com	$2a$12$eemdKVoNf/CeKEcJsIBZQeYzHJHPC21OkgTXYwBwW3O6RbNOjSSLW	Charlie	Developer	Full-stack developer passionate about clean code	/uploads/avatars/user_14_njk97iinfuc.png	t	f	\N	\N	\N	\N	2025-09-02 16:42:36.753	2025-10-06 21:54:52.104	40.7128000	-74.0060000	New York	New York	United States	2025-10-06 21:54:52.104	\N	city	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
15	diana_designer	diana@example.com	$2a$12$QRlmrBKMFDa.Kwhf5iRLg.K7JugHR7uBPXtXhH/GSNKZqqa7lC2Ii	Diana	Designer	UI/UX designer creating beautiful experiences	/uploads/avatars/user_15_x2w9ugbrqdm.png	t	f	\N	\N	\N	\N	2025-09-16 05:28:17.269	2025-10-06 21:54:52.106	34.0522000	-118.2437000	Los Angeles	California	United States	2025-10-06 21:54:52.106	\N	exact	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
16	erik_engineer	erik@example.com	$2a$12$IFJ9VjSu0RqUaycNDId5nOIsJMEcHBEHcfw7ZxtI2tXLsT.ONNPaO	Erik	Engineer	Software engineer solving complex problems	/uploads/avatars/user_16_ttimniddi7.png	t	f	\N	\N	\N	\N	2025-09-03 07:58:07.495	2025-10-06 21:54:52.109	47.6062000	-122.3321000	Seattle	Washington	United States	2025-10-06 21:54:52.109	\N	city	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
17	fiona_frontend	fiona@example.com	$2a$12$d.vyETVHD1zSpNU45xdxXuoey0IxyQVyH7IvH7qSLL8.2g2T6SGEm	Fiona	Frontend	Frontend specialist with an eye for detail	/uploads/avatars/user_17_tjj6k7aknfo.png	t	f	\N	\N	\N	\N	2025-09-22 11:00:59.574	2025-10-06 21:54:52.112	42.3601000	-71.0589000	Boston	Massachusetts	United States	2025-10-06 21:54:52.112	\N	exact	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
18	george_gamer	george@example.com	$2a$12$4R2m3tY12fFTNxYMuxM1HOWVL0y2qsdx0Gf7MxuwdJRjBQxgCAQBq	George	Gamer	Game developer and tech enthusiast	/uploads/avatars/user_18_ezab3mjwknn.png	t	f	\N	\N	\N	\N	2025-09-02 03:33:07.779	2025-10-06 21:54:52.115	41.8781000	-87.6298000	Chicago	Illinois	United States	2025-10-06 21:54:52.115	\N	city	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
19	helen_hacker	helen@example.com	$2a$12$i8NstDKV9FO06elT7aw/k.25AHp6Q1BDZkc5lzjGwz97kJSzpFLG6	Helen	Hacker	Ethical hacker and cybersecurity expert	/uploads/avatars/user_19_2bofnh06pwa.png	t	f	\N	\N	\N	\N	2025-09-26 05:19:07.594	2025-10-06 21:54:52.117	45.5152000	-122.6784000	Portland	Oregon	United States	2025-10-06 21:54:52.117	\N	exact	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
20	ivan_innovator	ivan@example.com	$2a$12$Eg3EhipIGjfp/YLuRR/I7ut3UrggMkfpKkAicy7qDqtNuV/JHRe1G	Ivan	Innovator	Always exploring new technologies and ideas	/uploads/avatars/user_20_cl9wfn5n40i.png	t	f	\N	\N	\N	\N	2025-09-11 10:04:31.256	2025-10-06 21:54:52.12	39.7392000	-104.9903000	Denver	Colorado	United States	2025-10-06 21:54:52.12	\N	city	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
21	julia_js	julia@example.com	$2a$12$smVpt2U1Bmpgazn1b7sjLOoqVQpW23oW2RZGLjsUZQf.9UwW644Aq	Julia	JavaScript	JavaScript enthusiast and React lover	/uploads/avatars/user_21_y8iic49xvke.png	t	f	\N	\N	\N	\N	2025-09-04 23:47:39.906	2025-10-06 21:54:52.123	25.7617000	-80.1918000	Miami	Florida	United States	2025-10-06 21:54:52.123	\N	exact	t	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
22	admin	admin@example.com	$2a$12$bWujPhCQowhhN7R4ySOsEeg5G8eLQmOfhrLO6nRTagG2Bxmve0sm6	Admin	User	System Administrator12121	/uploads/avatars/user_22_admin.png	t	t	\N	\N	\N	2025-10-28 03:50:11.624	2025-10-01 22:37:58.3	2025-10-28 10:50:11.624	33.8785522	-117.3223244	Riverside	CA	United States	2025-10-13 22:00:01.885	1865	exact	f	9503 Los Coches Ct	92508	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
23	testuser1	testuser1@example.com	$2a$12$.GL6G.CHc3PuGFwfx.zKUeqf4qzfD5rshY8CWsxAaG6.4y7IfSNwC	Test	User1	\N	\N	t	f	\N	\N	\N	\N	2025-10-03 04:08:41.12	2025-10-03 04:08:41.12	\N	\N	\N	\N	\N	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
24	testuser2	testuser2@example.com	$2a$12$LGZk8b57oI8zhb1Hb5hGH.96FvqrHYwJ0m2Ml/hulI8YUO5WJMkIK	Test	User2	\N	\N	t	f	\N	\N	\N	\N	2025-10-03 04:08:43.584	2025-10-03 04:08:43.584	\N	\N	\N	\N	\N	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
25	geocodetest	geocode@test.com	$2a$12$jZ4s4Ih/6zydRqDzbfstbOXuXGc8v/3cMpwLtHsJhXy6ZzQ8g3xO2	Geocode	Test	\N	\N	t	f	\N	\N	\N	2025-10-08 19:44:51.538	2025-10-08 19:29:57.014	2025-10-09 02:45:00.644	40.7484421	-73.9856589	New York	NY	USA	\N	\N	off	f	350 5th Ave	10118	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
26	grouptest	grouptest@test.com	$2a$12$QZe2Ux8lxHjHaWVwK3xJoeW7jWswB/FurpJ6ZnCmsAwITgyxBTQ/6	Group	Tester	\N	\N	t	f	\N	\N	\N	\N	2025-10-09 13:20:10.583	2025-10-09 13:20:10.583	\N	\N	\N	\N	\N	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
30	admin_alice	alice@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Alice	Anderson	Community organizer and tech enthusiast. Love connecting people! 🚀	https://i.pravatar.cc/300?img=1	t	f	\N	\N	\N	2025-10-31 03:12:35.385	2025-10-11 20:50:24.194	2025-10-31 10:12:35.386	40.7128000	-74.0060000	New York	NY	United States	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
31	mod_bob	bob@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Bob	Builder	Keeping communities safe and friendly. Coffee lover ☕	https://i.pravatar.cc/300?img=12	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.197	2025-10-11 20:50:24.197	34.0522000	-118.2437000	Los Angeles	CA	United States	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
32	charlie_coder	charlie.coder@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Charlie	Chen	Full-stack developer. Building cool stuff with React and Node 💻	https://i.pravatar.cc/300?img=13	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.2	2025-10-11 20:50:24.2	37.7749000	-122.4194000	San Francisco	\N	United States	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
33	diana_design	diana@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Diana	Davis	UX/UI Designer. Making the web beautiful one pixel at a time ✨	https://i.pravatar.cc/300?img=5	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.202	2025-10-11 20:50:24.202	51.5074000	-0.1278000	London	\N	United Kingdom	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
34	evan_photo	evan@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Evan	Evans	Photographer and visual storyteller 📸 Capturing moments	https://i.pravatar.cc/300?img=15	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.204	2025-10-11 20:50:24.204	48.8566000	2.3522000	Paris	\N	France	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
35	frank_foodie	frank@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Frank	Foster	Food blogger and recipe creator. Sharing delicious adventures 🍕	https://i.pravatar.cc/300?img=11	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.206	2025-10-11 20:50:24.206	35.6762000	139.6503000	Tokyo	\N	Japan	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
36	grace_chef	grace@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Grace	Garcia	Professional chef. Teaching people to cook with love 👩‍🍳	https://i.pravatar.cc/300?img=9	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.208	2025-10-11 20:50:24.208	41.9028000	12.4964000	Rome	\N	Italy	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
37	henry_gamer	henry@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Henry	Harris	Esports enthusiast and streamer 🎮 Come watch my streams!	https://i.pravatar.cc/300?img=17	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.21	2025-10-11 20:50:24.21	-33.8688000	151.2093000	Sydney	\N	Australia	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
38	iris_rpg	iris@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Iris	Irwin	RPG lover and dungeon master. Rolling dice since 2005 🎲	https://i.pravatar.cc/300?img=16	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.212	2025-10-11 20:50:24.212	49.2827000	-123.1207000	Vancouver	\N	Canada	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
39	jack_social	jack@groups.test	$2a$10$dOYhBGMXdvRGwOuz501EzOvmM5G7ZOBpy6b.j5z.zewBATdaRHSX.	Jack	Jackson	Community connector. Member of many groups! 🌐	https://i.pravatar.cc/300?img=18	t	f	\N	\N	\N	\N	2025-10-11 20:50:24.214	2025-10-11 20:50:24.214	52.5200000	13.4050000	Berlin	\N	Germany	\N	\N	off	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	public	\N	\N	\N	\N
\.


--
-- Name: comment_interactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comment_interactions_id_seq', 1, false);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.comments_id_seq', 190, true);


--
-- Name: conversation_participants_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversation_participants_id_seq', 11, true);


--
-- Name: conversations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.conversations_id_seq', 4, true);


--
-- Name: follows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.follows_id_seq', 7, true);


--
-- Name: group_activity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_activity_log_id_seq', 1, false);


--
-- Name: group_comment_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_comment_media_id_seq', 1, false);


--
-- Name: group_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_comments_id_seq', 1, false);


--
-- Name: group_invitations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_invitations_id_seq', 1, false);


--
-- Name: group_memberships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_memberships_id_seq', 1, false);


--
-- Name: group_post_media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_post_media_id_seq', 1, false);


--
-- Name: group_posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_posts_id_seq', 1, false);


--
-- Name: group_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.group_votes_id_seq', 1, false);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.groups_id_seq', 1, false);


--
-- Name: helpful_marks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.helpful_marks_id_seq', 1, false);


--
-- Name: location_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.location_history_id_seq', 14, true);


--
-- Name: media_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.media_id_seq', 6, true);


--
-- Name: message_reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_reactions_id_seq', 1, false);


--
-- Name: message_reads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.message_reads_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.messages_id_seq', 2, true);


--
-- Name: nearby_search_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.nearby_search_cache_id_seq', 1, false);


--
-- Name: notification_batches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_batches_id_seq', 1, false);


--
-- Name: notification_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notification_preferences_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: poll_options_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.poll_options_id_seq', 1, false);


--
-- Name: poll_votes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.poll_votes_id_seq', 1, false);


--
-- Name: posts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.posts_id_seq', 34, true);


--
-- Name: rating_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.rating_reports_id_seq', 1, false);


--
-- Name: reactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.reactions_id_seq', 142, true);


--
-- Name: shares_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.shares_id_seq', 1, true);


--
-- Name: timeline_cache_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.timeline_cache_id_seq', 1, false);


--
-- Name: typing_indicators_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.typing_indicators_id_seq', 1, false);


--
-- Name: user_ratings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.user_ratings_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 39, true);


--
-- Name: comment_interactions comment_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_interactions
    ADD CONSTRAINT comment_interactions_pkey PRIMARY KEY (id);


--
-- Name: comment_metrics comment_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_metrics
    ADD CONSTRAINT comment_metrics_pkey PRIMARY KEY (comment_id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_conversation_id_user_id_left_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_user_id_left_at_key UNIQUE (conversation_id, user_id, left_at);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: follows follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_pkey PRIMARY KEY (id);


--
-- Name: group_activity_log group_activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activity_log
    ADD CONSTRAINT group_activity_log_pkey PRIMARY KEY (id);


--
-- Name: group_comment_media group_comment_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comment_media
    ADD CONSTRAINT group_comment_media_pkey PRIMARY KEY (id);


--
-- Name: group_comments group_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comments
    ADD CONSTRAINT group_comments_pkey PRIMARY KEY (id);


--
-- Name: group_invitations group_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_pkey PRIMARY KEY (id);


--
-- Name: group_invitations group_invitations_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_token_key UNIQUE (token);


--
-- Name: group_memberships group_memberships_group_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_user_id_key UNIQUE (group_id, user_id);


--
-- Name: group_memberships group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_pkey PRIMARY KEY (id);


--
-- Name: group_post_media group_post_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_post_media
    ADD CONSTRAINT group_post_media_pkey PRIMARY KEY (id);


--
-- Name: group_posts group_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_posts
    ADD CONSTRAINT group_posts_pkey PRIMARY KEY (id);


--
-- Name: group_votes group_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_pkey PRIMARY KEY (id);


--
-- Name: groups groups_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key UNIQUE (name);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: groups groups_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_slug_key UNIQUE (slug);


--
-- Name: helpful_marks helpful_marks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpful_marks
    ADD CONSTRAINT helpful_marks_pkey PRIMARY KEY (id);


--
-- Name: location_history location_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: message_reactions message_reactions_message_id_user_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_user_id_emoji_key UNIQUE (message_id, user_id, emoji);


--
-- Name: message_reactions message_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_pkey PRIMARY KEY (id);


--
-- Name: message_reads message_reads_message_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_user_id_key UNIQUE (message_id, user_id);


--
-- Name: message_reads message_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: nearby_search_cache nearby_search_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nearby_search_cache
    ADD CONSTRAINT nearby_search_cache_pkey PRIMARY KEY (id);


--
-- Name: notification_batches notification_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_batches
    ADD CONSTRAINT notification_batches_pkey PRIMARY KEY (id);


--
-- Name: notification_batches notification_batches_user_id_type_entity_type_entity_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_batches
    ADD CONSTRAINT notification_batches_user_id_type_entity_type_entity_id_key UNIQUE (user_id, type, entity_type, entity_id);


--
-- Name: notification_preferences notification_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_pkey PRIMARY KEY (id);


--
-- Name: notification_preferences notification_preferences_user_id_notification_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_notification_type_key UNIQUE (user_id, notification_type);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: poll_options poll_options_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_pkey PRIMARY KEY (id);


--
-- Name: poll_options poll_options_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_unique UNIQUE (post_id, option_order);


--
-- Name: poll_votes poll_votes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_pkey PRIMARY KEY (id);


--
-- Name: poll_votes poll_votes_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_unique UNIQUE (post_id, user_id);


--
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- Name: rating_reports rating_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_pkey PRIMARY KEY (id);


--
-- Name: reactions reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_pkey PRIMARY KEY (id);


--
-- Name: shares shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_pkey PRIMARY KEY (id);


--
-- Name: timeline_cache timeline_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT timeline_cache_pkey PRIMARY KEY (id);


--
-- Name: typing_indicators typing_indicators_conversation_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_user_id_key UNIQUE (conversation_id, user_id);


--
-- Name: typing_indicators typing_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_pkey PRIMARY KEY (id);


--
-- Name: group_votes unique_comment_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT unique_comment_vote UNIQUE (user_id, comment_id);


--
-- Name: follows unique_follow; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT unique_follow UNIQUE (follower_id, following_id);


--
-- Name: helpful_marks unique_helpful_mark; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpful_marks
    ADD CONSTRAINT unique_helpful_mark UNIQUE (user_id, target_type, target_id);


--
-- Name: group_votes unique_post_vote; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT unique_post_vote UNIQUE (user_id, post_id);


--
-- Name: user_ratings unique_rating; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT unique_rating UNIQUE (rater_id, rated_user_id, context_type, context_id);


--
-- Name: reactions unique_user_comment_emoji; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT unique_user_comment_emoji UNIQUE (user_id, comment_id, emoji_name);


--
-- Name: reactions unique_user_post_emoji; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT unique_user_post_emoji UNIQUE (user_id, post_id, emoji_name);


--
-- Name: timeline_cache unique_user_post_timeline; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT unique_user_post_timeline UNIQUE (user_id, post_id);


--
-- Name: shares unique_user_share; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT unique_user_share UNIQUE (user_id, post_id);


--
-- Name: user_ratings user_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_pkey PRIMARY KEY (id);


--
-- Name: user_reputation user_reputation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reputation
    ADD CONSTRAINT user_reputation_pkey PRIMARY KEY (user_id);


--
-- Name: user_stats user_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_comment_interactions_comment_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_interactions_comment_type ON public.comment_interactions USING btree (comment_id, interaction_type);


--
-- Name: idx_comment_interactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_interactions_created_at ON public.comment_interactions USING btree (created_at);


--
-- Name: idx_comment_interactions_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_interactions_session_id ON public.comment_interactions USING btree (session_id);


--
-- Name: idx_comment_interactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_interactions_user_id ON public.comment_interactions USING btree (user_id);


--
-- Name: idx_comment_metrics_algorithm_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_metrics_algorithm_score ON public.comment_metrics USING btree (combined_algorithm_score DESC);


--
-- Name: idx_comment_metrics_interaction_rate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_metrics_interaction_rate ON public.comment_metrics USING btree (interaction_rate DESC);


--
-- Name: idx_comment_metrics_last_interaction; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comment_metrics_last_interaction ON public.comment_metrics USING btree (last_interaction_at DESC);


--
-- Name: idx_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_created_at ON public.comments USING btree (created_at);


--
-- Name: idx_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id);


--
-- Name: idx_comments_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);


--
-- Name: idx_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_user_id ON public.comments USING btree (user_id);


--
-- Name: idx_conversation_participants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_active ON public.conversation_participants USING btree (user_id, left_at) WHERE (left_at IS NULL);


--
-- Name: idx_conversation_participants_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_conversation ON public.conversation_participants USING btree (conversation_id);


--
-- Name: idx_conversation_participants_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_participants_user ON public.conversation_participants USING btree (user_id);


--
-- Name: idx_conversations_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_created_by ON public.conversations USING btree (created_by);


--
-- Name: idx_conversations_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_group ON public.conversations USING btree (group_id);


--
-- Name: idx_conversations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_type ON public.conversations USING btree (type);


--
-- Name: idx_conversations_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_updated_at ON public.conversations USING btree (updated_at DESC);


--
-- Name: idx_follows_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_composite ON public.follows USING btree (follower_id, following_id, status);


--
-- Name: idx_follows_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_created_at ON public.follows USING btree (created_at);


--
-- Name: idx_follows_follower_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_follower_id ON public.follows USING btree (follower_id);


--
-- Name: idx_follows_following_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_following_id ON public.follows USING btree (following_id);


--
-- Name: idx_follows_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_status ON public.follows USING btree (status);


--
-- Name: idx_group_activity_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activity_log_action ON public.group_activity_log USING btree (action_type);


--
-- Name: idx_group_activity_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activity_log_created ON public.group_activity_log USING btree (created_at DESC);


--
-- Name: idx_group_activity_log_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_activity_log_group ON public.group_activity_log USING btree (group_id);


--
-- Name: idx_group_comment_media_comment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comment_media_comment ON public.group_comment_media USING btree (comment_id);


--
-- Name: idx_group_comments_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comments_created ON public.group_comments USING btree (created_at DESC);


--
-- Name: idx_group_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comments_parent ON public.group_comments USING btree (parent_id);


--
-- Name: idx_group_comments_path; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comments_path ON public.group_comments USING gist (path);


--
-- Name: idx_group_comments_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comments_post ON public.group_comments USING btree (post_id);


--
-- Name: idx_group_comments_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comments_score ON public.group_comments USING btree (post_id, score DESC);


--
-- Name: idx_group_comments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_comments_user ON public.group_comments USING btree (user_id);


--
-- Name: idx_group_invitations_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_group ON public.group_invitations USING btree (group_id);


--
-- Name: idx_group_invitations_invitee; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_invitee ON public.group_invitations USING btree (invitee_id);


--
-- Name: idx_group_invitations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_status ON public.group_invitations USING btree (status);


--
-- Name: idx_group_invitations_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_invitations_token ON public.group_invitations USING btree (token);


--
-- Name: idx_group_memberships_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_memberships_group ON public.group_memberships USING btree (group_id);


--
-- Name: idx_group_memberships_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_memberships_role ON public.group_memberships USING btree (group_id, role);


--
-- Name: idx_group_memberships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_memberships_status ON public.group_memberships USING btree (status);


--
-- Name: idx_group_memberships_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_memberships_user ON public.group_memberships USING btree (user_id);


--
-- Name: idx_group_post_media_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_post_media_post ON public.group_post_media USING btree (post_id);


--
-- Name: idx_group_post_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_post_media_type ON public.group_post_media USING btree (media_type);


--
-- Name: idx_group_posts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_created ON public.group_posts USING btree (group_id, created_at DESC);


--
-- Name: idx_group_posts_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_group ON public.group_posts USING btree (group_id);


--
-- Name: idx_group_posts_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_pinned ON public.group_posts USING btree (group_id, is_pinned, created_at DESC);


--
-- Name: idx_group_posts_poll; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_poll ON public.group_posts USING btree (post_type) WHERE ((post_type)::text = 'poll'::text);


--
-- Name: idx_group_posts_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_score ON public.group_posts USING btree (group_id, score DESC);


--
-- Name: idx_group_posts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_status ON public.group_posts USING btree (status);


--
-- Name: idx_group_posts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_posts_user ON public.group_posts USING btree (user_id);


--
-- Name: idx_group_votes_comment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_votes_comment ON public.group_votes USING btree (comment_id);


--
-- Name: idx_group_votes_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_votes_post ON public.group_votes USING btree (post_id);


--
-- Name: idx_group_votes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_votes_user ON public.group_votes USING btree (user_id);


--
-- Name: idx_groups_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_conversation ON public.groups USING btree (conversation_id);


--
-- Name: idx_groups_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_created ON public.groups USING btree (created_at DESC);


--
-- Name: idx_groups_creator; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_creator ON public.groups USING btree (creator_id);


--
-- Name: idx_groups_location_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_location_coords ON public.groups USING btree (location_latitude, location_longitude) WHERE (location_restricted = true);


--
-- Name: idx_groups_location_restricted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_location_restricted ON public.groups USING btree (location_restricted) WHERE (location_restricted = true);


--
-- Name: idx_groups_name_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_name_search ON public.groups USING gin (to_tsvector('english'::regconfig, (((display_name)::text || ' '::text) || COALESCE(description, ''::text))));


--
-- Name: idx_groups_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_slug ON public.groups USING btree (slug);


--
-- Name: idx_groups_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_groups_visibility ON public.groups USING btree (visibility);


--
-- Name: idx_helpful_marks_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_helpful_marks_target ON public.helpful_marks USING btree (target_type, target_id);


--
-- Name: idx_helpful_marks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_helpful_marks_user ON public.helpful_marks USING btree (user_id);


--
-- Name: idx_location_history_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_history_coords ON public.location_history USING btree (location_latitude, location_longitude);


--
-- Name: idx_location_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_history_created_at ON public.location_history USING btree (created_at DESC);


--
-- Name: idx_location_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_location_history_user_id ON public.location_history USING btree (user_id);


--
-- Name: idx_media_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_comment_id ON public.media USING btree (comment_id);


--
-- Name: idx_media_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_post_id ON public.media USING btree (post_id);


--
-- Name: idx_media_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_type ON public.media USING btree (media_type);


--
-- Name: idx_media_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_media_user_id ON public.media USING btree (user_id);


--
-- Name: idx_message_reactions_emoji; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_emoji ON public.message_reactions USING btree (emoji);


--
-- Name: idx_message_reactions_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_message ON public.message_reactions USING btree (message_id);


--
-- Name: idx_message_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reactions_user ON public.message_reactions USING btree (user_id);


--
-- Name: idx_message_reads_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reads_message ON public.message_reads USING btree (message_id);


--
-- Name: idx_message_reads_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_message_reads_user ON public.message_reads USING btree (user_id);


--
-- Name: idx_messages_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_conversation ON public.messages USING btree (conversation_id, created_at DESC);


--
-- Name: idx_messages_not_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_not_deleted ON public.messages USING btree (conversation_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_messages_reply_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_reply_to ON public.messages USING btree (reply_to_id);


--
-- Name: idx_messages_sender; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_sender ON public.messages USING btree (sender_id);


--
-- Name: idx_nearby_cache_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nearby_cache_coords ON public.nearby_search_cache USING btree (search_lat, search_lon);


--
-- Name: idx_nearby_cache_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nearby_cache_expires_at ON public.nearby_search_cache USING btree (expires_at);


--
-- Name: idx_nearby_cache_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nearby_cache_user_id ON public.nearby_search_cache USING btree (user_id);


--
-- Name: idx_notification_batches_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_batches_entity ON public.notification_batches USING btree (entity_type, entity_id);


--
-- Name: idx_notification_batches_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_batches_user ON public.notification_batches USING btree (user_id);


--
-- Name: idx_notification_preferences_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_preferences_user ON public.notification_preferences USING btree (user_id);


--
-- Name: idx_notifications_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_actor ON public.notifications USING btree (actor_id);


--
-- Name: idx_notifications_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_entity ON public.notifications USING btree (entity_type, entity_id);


--
-- Name: idx_notifications_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_expires ON public.notifications USING btree (expires_at) WHERE (expires_at IS NOT NULL);


--
-- Name: idx_notifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_type ON public.notifications USING btree (type);


--
-- Name: idx_notifications_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_unread ON public.notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);


--
-- Name: idx_notifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_poll_options_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_poll_options_post ON public.poll_options USING btree (post_id);


--
-- Name: idx_poll_votes_option; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_poll_votes_option ON public.poll_votes USING btree (option_id);


--
-- Name: idx_poll_votes_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_poll_votes_post ON public.poll_votes USING btree (post_id);


--
-- Name: idx_poll_votes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_poll_votes_user ON public.poll_votes USING btree (user_id);


--
-- Name: idx_posts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_created_at ON public.posts USING btree (created_at);


--
-- Name: idx_posts_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_deleted_at ON public.posts USING btree (deleted_at);


--
-- Name: idx_posts_privacy_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_privacy_level ON public.posts USING btree (privacy_level);


--
-- Name: idx_posts_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_published ON public.posts USING btree (is_published);


--
-- Name: idx_posts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_posts_user_id ON public.posts USING btree (user_id);


--
-- Name: idx_rating_reports_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rating_reports_rating ON public.rating_reports USING btree (rating_id);


--
-- Name: idx_rating_reports_reporter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rating_reports_reporter ON public.rating_reports USING btree (reporter_id);


--
-- Name: idx_rating_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rating_reports_status ON public.rating_reports USING btree (status);


--
-- Name: idx_reactions_comment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_comment_id ON public.reactions USING btree (comment_id);


--
-- Name: idx_reactions_emoji_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_emoji_name ON public.reactions USING btree (emoji_name);


--
-- Name: idx_reactions_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_post_id ON public.reactions USING btree (post_id);


--
-- Name: idx_reactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_user_id ON public.reactions USING btree (user_id);


--
-- Name: idx_shares_composite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shares_composite ON public.shares USING btree (post_id, created_at DESC);


--
-- Name: idx_shares_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shares_created_at ON public.shares USING btree (created_at);


--
-- Name: idx_shares_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shares_post_id ON public.shares USING btree (post_id);


--
-- Name: idx_shares_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shares_type ON public.shares USING btree (share_type);


--
-- Name: idx_shares_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shares_user_id ON public.shares USING btree (user_id);


--
-- Name: idx_timeline_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_expires_at ON public.timeline_cache USING btree (expires_at);


--
-- Name: idx_timeline_post_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_post_id ON public.timeline_cache USING btree (post_id);


--
-- Name: idx_timeline_reason; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_reason ON public.timeline_cache USING btree (reason);


--
-- Name: idx_timeline_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_user_created ON public.timeline_cache USING btree (user_id, created_at DESC);


--
-- Name: idx_timeline_user_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_timeline_user_score ON public.timeline_cache USING btree (user_id, score DESC);


--
-- Name: idx_typing_indicators_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_conversation ON public.typing_indicators USING btree (conversation_id);


--
-- Name: idx_typing_indicators_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_typing_indicators_expires ON public.typing_indicators USING btree (expires_at);


--
-- Name: idx_user_ratings_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ratings_context ON public.user_ratings USING btree (context_type, context_id);


--
-- Name: idx_user_ratings_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ratings_created ON public.user_ratings USING btree (created_at DESC);


--
-- Name: idx_user_ratings_rated_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ratings_rated_user ON public.user_ratings USING btree (rated_user_id);


--
-- Name: idx_user_ratings_rater; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ratings_rater ON public.user_ratings USING btree (rater_id);


--
-- Name: idx_user_ratings_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_ratings_type ON public.user_ratings USING btree (rating_type);


--
-- Name: idx_user_reputation_avg_rating; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reputation_avg_rating ON public.user_reputation USING btree (average_rating DESC);


--
-- Name: idx_user_reputation_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reputation_level ON public.user_reputation USING btree (reputation_level);


--
-- Name: idx_user_reputation_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reputation_score ON public.user_reputation USING btree (reputation_score DESC);


--
-- Name: idx_user_stats_engagement_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_stats_engagement_score ON public.user_stats USING btree (engagement_score DESC);


--
-- Name: idx_user_stats_follower_count; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_stats_follower_count ON public.user_stats USING btree (follower_count DESC);


--
-- Name: idx_user_stats_last_post_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_stats_last_post_at ON public.user_stats USING btree (last_post_at DESC);


--
-- Name: idx_users_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_active ON public.users USING btree (is_active);


--
-- Name: idx_users_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_created_at ON public.users USING btree (created_at);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_expertise; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_expertise ON public.users USING gin (expertise);


--
-- Name: idx_users_favorite_pets; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_favorite_pets ON public.users USING gin (favorite_pets);


--
-- Name: idx_users_hobbies; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_hobbies ON public.users USING gin (hobbies);


--
-- Name: idx_users_location_coords; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_location_coords ON public.users USING btree (location_latitude, location_longitude);


--
-- Name: idx_users_location_sharing; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_location_sharing ON public.users USING btree (location_sharing);


--
-- Name: idx_users_location_updated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_location_updated ON public.users USING btree (location_updated_at);


--
-- Name: idx_users_profile_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_profile_visibility ON public.users USING btree (profile_visibility);


--
-- Name: idx_users_skills; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_skills ON public.users USING gin (skills);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: comment_interactions comment_interaction_metrics_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER comment_interaction_metrics_trigger AFTER INSERT ON public.comment_interactions FOR EACH ROW EXECUTE FUNCTION public.update_comment_metrics();


--
-- Name: users trigger_create_default_notification_preferences; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_default_notification_preferences AFTER INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION public.create_default_notification_preferences();


--
-- Name: location_history trigger_limit_location_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_limit_location_history AFTER INSERT ON public.location_history FOR EACH ROW EXECUTE FUNCTION public.limit_location_history();


--
-- Name: group_comments trigger_set_group_comment_path; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_group_comment_path BEFORE INSERT ON public.group_comments FOR EACH ROW EXECUTE FUNCTION public.set_group_comment_path();


--
-- Name: group_memberships trigger_sync_group_chat_on_join; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_group_chat_on_join AFTER INSERT OR UPDATE ON public.group_memberships FOR EACH ROW WHEN (((new.status)::text = 'active'::text)) EXECUTE FUNCTION public.sync_group_chat_on_join();


--
-- Name: group_memberships trigger_sync_group_chat_on_leave; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_group_chat_on_leave AFTER UPDATE ON public.group_memberships FOR EACH ROW WHEN (((old.status)::text IS DISTINCT FROM (new.status)::text)) EXECUTE FUNCTION public.sync_group_chat_on_leave();


--
-- Name: messages trigger_update_conversation_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_conversation_timestamp AFTER INSERT ON public.messages FOR EACH ROW WHEN ((new.deleted_at IS NULL)) EXECUTE FUNCTION public.update_conversation_timestamp();


--
-- Name: follows trigger_update_follow_counts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_follow_counts AFTER INSERT OR DELETE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();


--
-- Name: group_votes trigger_update_group_comment_votes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_group_comment_votes AFTER INSERT OR DELETE OR UPDATE ON public.group_votes FOR EACH ROW EXECUTE FUNCTION public.update_group_comment_votes();


--
-- Name: group_memberships trigger_update_group_member_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_group_member_count AFTER INSERT OR DELETE OR UPDATE ON public.group_memberships FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();


--
-- Name: group_comments trigger_update_group_post_comment_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_group_post_comment_count AFTER INSERT OR DELETE OR UPDATE ON public.group_comments FOR EACH ROW EXECUTE FUNCTION public.update_group_post_comment_count();


--
-- Name: group_posts trigger_update_group_post_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_group_post_count AFTER INSERT OR DELETE OR UPDATE ON public.group_posts FOR EACH ROW EXECUTE FUNCTION public.update_group_post_count();


--
-- Name: group_votes trigger_update_group_post_votes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_group_post_votes AFTER INSERT OR DELETE OR UPDATE ON public.group_votes FOR EACH ROW EXECUTE FUNCTION public.update_group_post_votes();


--
-- Name: helpful_marks trigger_update_helpful_count; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_helpful_count AFTER INSERT ON public.helpful_marks FOR EACH ROW EXECUTE FUNCTION public.update_helpful_count();


--
-- Name: message_reads trigger_update_participant_last_read; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_participant_last_read AFTER INSERT ON public.message_reads FOR EACH ROW EXECUTE FUNCTION public.update_participant_last_read();


--
-- Name: poll_votes trigger_update_poll_vote_counts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_poll_vote_counts AFTER INSERT OR DELETE OR UPDATE ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION public.update_poll_vote_counts();


--
-- Name: shares trigger_update_share_counts; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_share_counts AFTER INSERT OR DELETE ON public.shares FOR EACH ROW EXECUTE FUNCTION public.update_share_counts();


--
-- Name: user_ratings trigger_update_user_reputation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_user_reputation AFTER INSERT OR DELETE OR UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION public.update_user_reputation();


--
-- Name: conversations trigger_validate_group_conversation; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_group_conversation BEFORE INSERT OR UPDATE ON public.conversations FOR EACH ROW WHEN ((new.group_id IS NOT NULL)) EXECUTE FUNCTION public.validate_group_conversation();


--
-- Name: comments update_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: follows update_follows_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_follows_updated_at BEFORE UPDATE ON public.follows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: group_comments update_group_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_comments_updated_at BEFORE UPDATE ON public.group_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: group_posts update_group_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON public.group_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: group_votes update_group_votes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_group_votes_updated_at BEFORE UPDATE ON public.group_votes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: groups update_groups_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: media update_media_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_media_updated_at BEFORE UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: posts update_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reactions update_reactions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reactions_updated_at BEFORE UPDATE ON public.reactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_ratings update_user_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_ratings_updated_at BEFORE UPDATE ON public.user_ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_reputation update_user_reputation_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_reputation_updated_at BEFORE UPDATE ON public.user_reputation FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comment_interactions comment_interactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_interactions
    ADD CONSTRAINT comment_interactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comment_interactions comment_interactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_interactions
    ADD CONSTRAINT comment_interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: comment_metrics comment_metrics_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comment_metrics
    ADD CONSTRAINT comment_metrics_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversation_participants conversation_participants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;


--
-- Name: conversations fk_conversations_last_message; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT fk_conversations_last_message FOREIGN KEY (last_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: follows follows_follower_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: follows follows_following_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follows
    ADD CONSTRAINT follows_following_id_fkey FOREIGN KEY (following_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_activity_log group_activity_log_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activity_log
    ADD CONSTRAINT group_activity_log_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_activity_log group_activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_activity_log
    ADD CONSTRAINT group_activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: group_comment_media group_comment_media_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comment_media
    ADD CONSTRAINT group_comment_media_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.group_comments(id) ON DELETE CASCADE;


--
-- Name: group_comments group_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comments
    ADD CONSTRAINT group_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.group_comments(id) ON DELETE CASCADE;


--
-- Name: group_comments group_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comments
    ADD CONSTRAINT group_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id) ON DELETE CASCADE;


--
-- Name: group_comments group_comments_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comments
    ADD CONSTRAINT group_comments_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id);


--
-- Name: group_comments group_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_comments
    ADD CONSTRAINT group_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_invitations group_invitations_invitee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.users(id);


--
-- Name: group_invitations group_invitations_inviter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_invitations
    ADD CONSTRAINT group_invitations_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_banned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_banned_by_fkey FOREIGN KEY (banned_by) REFERENCES public.users(id);


--
-- Name: group_memberships group_memberships_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_memberships group_memberships_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);


--
-- Name: group_memberships group_memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_memberships
    ADD CONSTRAINT group_memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_post_media group_post_media_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_post_media
    ADD CONSTRAINT group_post_media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id) ON DELETE CASCADE;


--
-- Name: group_posts group_posts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_posts
    ADD CONSTRAINT group_posts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: group_posts group_posts_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_posts
    ADD CONSTRAINT group_posts_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: group_posts group_posts_removed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_posts
    ADD CONSTRAINT group_posts_removed_by_fkey FOREIGN KEY (removed_by) REFERENCES public.users(id);


--
-- Name: group_posts group_posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_posts
    ADD CONSTRAINT group_posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: group_votes group_votes_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.group_comments(id) ON DELETE CASCADE;


--
-- Name: group_votes group_votes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id) ON DELETE CASCADE;


--
-- Name: group_votes group_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_votes
    ADD CONSTRAINT group_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: groups groups_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;


--
-- Name: groups groups_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: helpful_marks helpful_marks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.helpful_marks
    ADD CONSTRAINT helpful_marks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: location_history location_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_history
    ADD CONSTRAINT location_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: media media_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: media media_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: media media_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reactions message_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reactions
    ADD CONSTRAINT message_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: message_reads message_reads_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.messages(id) ON DELETE CASCADE;


--
-- Name: message_reads message_reads_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.message_reads
    ADD CONSTRAINT message_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_reply_to_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_reply_to_id_fkey FOREIGN KEY (reply_to_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: nearby_search_cache nearby_search_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nearby_search_cache
    ADD CONSTRAINT nearby_search_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_batches notification_batches_last_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_batches
    ADD CONSTRAINT notification_batches_last_actor_id_fkey FOREIGN KEY (last_actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: notification_batches notification_batches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_batches
    ADD CONSTRAINT notification_batches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notification_preferences notification_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_preferences
    ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: poll_options poll_options_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_options
    ADD CONSTRAINT poll_options_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.group_posts(id) ON DELETE CASCADE;


--
-- Name: poll_votes poll_votes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.poll_votes
    ADD CONSTRAINT poll_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: posts posts_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);


--
-- Name: posts posts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rating_reports rating_reports_rating_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_rating_id_fkey FOREIGN KEY (rating_id) REFERENCES public.user_ratings(id) ON DELETE CASCADE;


--
-- Name: rating_reports rating_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: rating_reports rating_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rating_reports
    ADD CONSTRAINT rating_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reactions reactions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: reactions reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reactions
    ADD CONSTRAINT reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: shares shares_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: shares shares_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shares
    ADD CONSTRAINT shares_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: timeline_cache timeline_cache_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT timeline_cache_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- Name: timeline_cache timeline_cache_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.timeline_cache
    ADD CONSTRAINT timeline_cache_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: typing_indicators typing_indicators_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.typing_indicators
    ADD CONSTRAINT typing_indicators_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_ratings user_ratings_rated_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rated_user_id_fkey FOREIGN KEY (rated_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_ratings user_ratings_rater_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_ratings
    ADD CONSTRAINT user_ratings_rater_id_fkey FOREIGN KEY (rater_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_reputation user_reputation_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reputation
    ADD CONSTRAINT user_reputation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_stats user_stats_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_stats
    ADD CONSTRAINT user_stats_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict HAHJJivuBOx92GGloFJqGNxxqeND9qzYEnF2GAjcKpnozaTMPVbRhshd6qZqHxd

