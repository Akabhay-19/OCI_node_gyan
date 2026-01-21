-- Migration to add site_content table
create table if not exists site_content (
    id text primary key,
    content jsonb,
    "updatedAt" text
);

-- Seed initial content if not exists
insert into site_content (id, content, "updatedAt")
values (
    'GLOBAL_CONFIG',
    '{
        "teamMembers": [
            {
                "id": "1",
                "name": "Abhay Kumar",
                "role": "Founder & Lead Developer",
                "bio": "Visionary behind Gyan AI, passionate about EdTech and AI.",
                "imageUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Abhay",
                "socials": { "linkedin": "#", "twitter": "#", "github": "#" }
            },
            {
                "id": "2",
                "name": "Sarah Chen",
                "role": "Head of AI Research",
                "bio": "Expert in NLP and adaptive learning algorithms.",
                "imageUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
                "socials": { "linkedin": "#", "twitter": "#", "github": "#" }
            },
            {
                "id": "3",
                "name": "Marcus Rodriguez",
                "role": "Product Design",
                "bio": "Creating intuitive and beautiful user experiences.",
                "imageUrl": "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus",
                "socials": { "linkedin": "#", "twitter": "#", "github": "#" }
            }
        ]
    }'::jsonb,
    '2026-01-21T00:00:00Z'
)
on conflict (id) do nothing;
