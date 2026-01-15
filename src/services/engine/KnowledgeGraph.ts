import { ConceptNode, ConceptId } from './types';

class KnowledgeGraph {
    private nodes: Map<ConceptId, ConceptNode> = new Map();

    constructor() {
        this.initializeCurriculum();
    }

    // --- CORE GRAPH OPERATIONS ---

    addNode(node: ConceptNode) {
        this.nodes.set(node.id, node);
    }

    getNode(id: ConceptId): ConceptNode | undefined {
        return this.nodes.get(id);
    }

    /**
     * Get direct prerequisites for a concept.
     */
    getPrerequisites(id: ConceptId): ConceptNode[] {
        const node = this.nodes.get(id);
        if (!node || !node.prerequisites) return [];
        return (node.prerequisites || [])
            .map(pid => this.nodes.get(pid))
            .filter((n): n is ConceptNode => !!n);
    }

    /**
     * Get ALL recursive prerequisites (ancestors).
     * Used to detect deep foundational gaps.
     */
    getAncestors(id: ConceptId, visited = new Set<ConceptId>()): ConceptNode[] {
        const ancestors: ConceptNode[] = [];
        const node = this.nodes.get(id);
        if (!node) return [];

        for (const pid of node.prerequisites) {
            if (!visited.has(pid)) {
                visited.add(pid);
                const parent = this.nodes.get(pid);
                if (parent) {
                    ancestors.push(parent);
                    ancestors.push(...this.getAncestors(pid, visited));
                }
            }
        }
        return ancestors;
    }

    /**
     * Get all children (concepts that depend on this one).
     * Used to recommend "What's next?"
     */
    getDependents(id: ConceptId): ConceptNode[] {
        const dependents: ConceptNode[] = [];
        this.nodes.forEach(node => {
            if (node.prerequisites.includes(id)) {
                dependents.push(node);
            }
        });
        return dependents;
    }

    /**
     * Get all concepts for a given subject.
     */
    getBySubject(subject: string): ConceptNode[] {
        const results: ConceptNode[] = [];
        this.nodes.forEach(node => {
            if (node.subject.toLowerCase() === subject.toLowerCase()) {
                results.push(node);
            }
        });
        return results;
    }

    /**
     * Search concepts by label (case-insensitive partial match).
     */
    search(query: string): ConceptNode[] {
        const q = query.toLowerCase();
        const results: ConceptNode[] = [];
        this.nodes.forEach(node => {
            if (node.label.toLowerCase().includes(q) || node.id.toLowerCase().includes(q)) {
                results.push(node);
            }
        });
        return results;
    }

    // --- SEED DATA: CBSE/NCERT CURRICULUM ---
    private initializeCurriculum() {
        // ==================== MATHEMATICS ====================
        // Foundations
        this.addNode({ id: 'MATH_NUMBERS', label: 'Number Systems', subject: 'Math', difficulty: 0.1, prerequisites: [] });
        this.addNode({ id: 'MATH_FRACTIONS', label: 'Fractions & Decimals', subject: 'Math', difficulty: 0.15, prerequisites: ['MATH_NUMBERS'] });
        this.addNode({ id: 'MATH_RATIOS', label: 'Ratios & Proportions', subject: 'Math', difficulty: 0.2, prerequisites: ['MATH_FRACTIONS'] });
        this.addNode({ id: 'MATH_PERCENTAGES', label: 'Percentages', subject: 'Math', difficulty: 0.2, prerequisites: ['MATH_FRACTIONS'] });

        // Algebra
        this.addNode({ id: 'MATH_ALGEBRA_BASIC', label: 'Basic Algebra (Variables & Expressions)', subject: 'Math', difficulty: 0.2, prerequisites: ['MATH_NUMBERS'] });
        this.addNode({ id: 'MATH_LINEAR_EQ', label: 'Linear Equations in One Variable', subject: 'Math', difficulty: 0.3, prerequisites: ['MATH_ALGEBRA_BASIC'] });
        this.addNode({ id: 'MATH_LINEAR_EQ_TWO', label: 'Linear Equations in Two Variables', subject: 'Math', difficulty: 0.4, prerequisites: ['MATH_LINEAR_EQ'] });
        this.addNode({ id: 'MATH_QUADRATIC', label: 'Quadratic Equations', subject: 'Math', difficulty: 0.5, prerequisites: ['MATH_LINEAR_EQ'] });
        this.addNode({ id: 'MATH_POLYNOMIALS', label: 'Polynomials', subject: 'Math', difficulty: 0.4, prerequisites: ['MATH_ALGEBRA_BASIC'] });
        this.addNode({ id: 'MATH_FACTORIZATION', label: 'Factorization', subject: 'Math', difficulty: 0.35, prerequisites: ['MATH_POLYNOMIALS'] });

        // Geometry
        this.addNode({ id: 'MATH_GEOMETRY_BASIC', label: 'Basic Geometry (Lines & Angles)', subject: 'Math', difficulty: 0.2, prerequisites: [] });
        this.addNode({ id: 'MATH_TRIANGLES', label: 'Properties of Triangles', subject: 'Math', difficulty: 0.3, prerequisites: ['MATH_GEOMETRY_BASIC'] });
        this.addNode({ id: 'MATH_CONGRUENCE', label: 'Congruence of Triangles', subject: 'Math', difficulty: 0.35, prerequisites: ['MATH_TRIANGLES'] });
        this.addNode({ id: 'MATH_SIMILAR_TRIANGLES', label: 'Similar Triangles', subject: 'Math', difficulty: 0.4, prerequisites: ['MATH_TRIANGLES', 'MATH_RATIOS'] });
        this.addNode({ id: 'MATH_CIRCLES', label: 'Circles', subject: 'Math', difficulty: 0.4, prerequisites: ['MATH_GEOMETRY_BASIC'] });
        this.addNode({ id: 'MATH_AREA_VOLUME', label: 'Mensuration (Area & Volume)', subject: 'Math', difficulty: 0.35, prerequisites: ['MATH_GEOMETRY_BASIC'] });
        this.addNode({ id: 'MATH_COORDINATE', label: 'Coordinate Geometry', subject: 'Math', difficulty: 0.45, prerequisites: ['MATH_LINEAR_EQ_TWO', 'MATH_GEOMETRY_BASIC'] });

        // Advanced
        this.addNode({ id: 'MATH_TRIGONOMETRY', label: 'Trigonometry', subject: 'Math', difficulty: 0.5, prerequisites: ['MATH_TRIANGLES', 'MATH_RATIOS'] });
        this.addNode({ id: 'MATH_STATISTICS', label: 'Statistics (Mean, Median, Mode)', subject: 'Math', difficulty: 0.3, prerequisites: ['MATH_NUMBERS'] });
        this.addNode({ id: 'MATH_PROBABILITY', label: 'Probability', subject: 'Math', difficulty: 0.35, prerequisites: ['MATH_FRACTIONS'] });
        this.addNode({ id: 'MATH_AP_GP', label: 'Arithmetic & Geometric Progressions', subject: 'Math', difficulty: 0.45, prerequisites: ['MATH_ALGEBRA_BASIC'] });

        // ==================== PHYSICS ====================
        // Foundations
        this.addNode({ id: 'PHYS_UNITS', label: 'Units & Measurements', subject: 'Physics', difficulty: 0.1, prerequisites: [] });
        this.addNode({ id: 'PHYS_VECTORS', label: 'Vectors & Scalars', subject: 'Physics', difficulty: 0.3, prerequisites: ['MATH_ALGEBRA_BASIC', 'MATH_TRIGONOMETRY'] });

        // Kinematics
        this.addNode({ id: 'PHYS_MOTION_1D', label: 'Motion in One Dimension', subject: 'Physics', difficulty: 0.25, prerequisites: ['PHYS_UNITS', 'MATH_ALGEBRA_BASIC'] });
        this.addNode({ id: 'PHYS_MOTION_2D', label: 'Projectile Motion', subject: 'Physics', difficulty: 0.5, prerequisites: ['PHYS_MOTION_1D', 'PHYS_VECTORS'] });
        this.addNode({ id: 'PHYS_CIRCULAR', label: 'Circular Motion', subject: 'Physics', difficulty: 0.55, prerequisites: ['PHYS_MOTION_2D'] });

        // Newton's Laws
        this.addNode({ id: 'PHYS_NEWTON_1', label: "Newton's First Law (Inertia)", subject: 'Physics', difficulty: 0.2, prerequisites: ['PHYS_MOTION_1D'] });
        this.addNode({ id: 'PHYS_NEWTON_2', label: "Newton's Second Law (F=ma)", subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_NEWTON_1', 'PHYS_VECTORS'] });
        this.addNode({ id: 'PHYS_NEWTON_3', label: "Newton's Third Law", subject: 'Physics', difficulty: 0.3, prerequisites: ['PHYS_NEWTON_1'] });
        this.addNode({ id: 'PHYS_FRICTION', label: 'Friction', subject: 'Physics', difficulty: 0.45, prerequisites: ['PHYS_NEWTON_2'] });

        // Energy & Work
        this.addNode({ id: 'PHYS_WORK', label: 'Work', subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_NEWTON_2'] });
        this.addNode({ id: 'PHYS_ENERGY', label: 'Energy (KE, PE)', subject: 'Physics', difficulty: 0.45, prerequisites: ['PHYS_WORK'] });
        this.addNode({ id: 'PHYS_POWER', label: 'Power', subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_WORK'] });
        this.addNode({ id: 'PHYS_CONSERVATION', label: 'Conservation of Energy', subject: 'Physics', difficulty: 0.5, prerequisites: ['PHYS_ENERGY'] });

        // Gravitation
        this.addNode({ id: 'PHYS_GRAVITATION', label: 'Gravitation', subject: 'Physics', difficulty: 0.5, prerequisites: ['PHYS_NEWTON_2'] });

        // Waves & Sound
        this.addNode({ id: 'PHYS_WAVES', label: 'Wave Motion', subject: 'Physics', difficulty: 0.45, prerequisites: [] });
        this.addNode({ id: 'PHYS_SOUND', label: 'Sound', subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_WAVES'] });

        // Light & Optics
        this.addNode({ id: 'PHYS_LIGHT_REFLECTION', label: 'Reflection of Light', subject: 'Physics', difficulty: 0.3, prerequisites: [] });
        this.addNode({ id: 'PHYS_LIGHT_REFRACTION', label: 'Refraction of Light', subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_LIGHT_REFLECTION'] });
        this.addNode({ id: 'PHYS_LENSES', label: 'Lenses', subject: 'Physics', difficulty: 0.45, prerequisites: ['PHYS_LIGHT_REFRACTION'] });
        this.addNode({ id: 'PHYS_HUMAN_EYE', label: 'Human Eye & Defects', subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_LENSES'] });

        // Electricity
        this.addNode({ id: 'PHYS_CURRENT', label: 'Electric Current', subject: 'Physics', difficulty: 0.35, prerequisites: [] });
        this.addNode({ id: 'PHYS_OHM', label: "Ohm's Law", subject: 'Physics', difficulty: 0.4, prerequisites: ['PHYS_CURRENT'] });
        this.addNode({ id: 'PHYS_CIRCUITS', label: 'Electric Circuits', subject: 'Physics', difficulty: 0.5, prerequisites: ['PHYS_OHM'] });
        this.addNode({ id: 'PHYS_POWER_ELEC', label: 'Electrical Power & Energy', subject: 'Physics', difficulty: 0.45, prerequisites: ['PHYS_CIRCUITS'] });

        // Magnetism
        this.addNode({ id: 'PHYS_MAGNETISM', label: 'Magnetic Effects of Current', subject: 'Physics', difficulty: 0.5, prerequisites: ['PHYS_CURRENT'] });
        this.addNode({ id: 'PHYS_EMI', label: 'Electromagnetic Induction', subject: 'Physics', difficulty: 0.6, prerequisites: ['PHYS_MAGNETISM'] });

        // ==================== CHEMISTRY ====================
        // Foundations
        this.addNode({ id: 'CHEM_MATTER', label: 'Matter & Its Properties', subject: 'Chemistry', difficulty: 0.1, prerequisites: [] });
        this.addNode({ id: 'CHEM_ATOMS', label: 'Atoms & Molecules', subject: 'Chemistry', difficulty: 0.2, prerequisites: ['CHEM_MATTER'] });
        this.addNode({ id: 'CHEM_ATOMIC_STRUCTURE', label: 'Atomic Structure', subject: 'Chemistry', difficulty: 0.35, prerequisites: ['CHEM_ATOMS'] });

        // Periodic Table
        this.addNode({ id: 'CHEM_PERIODIC', label: 'Periodic Table', subject: 'Chemistry', difficulty: 0.3, prerequisites: ['CHEM_ATOMIC_STRUCTURE'] });
        this.addNode({ id: 'CHEM_PERIODIC_TRENDS', label: 'Periodic Trends', subject: 'Chemistry', difficulty: 0.4, prerequisites: ['CHEM_PERIODIC'] });

        // Bonding
        this.addNode({ id: 'CHEM_IONIC', label: 'Ionic Bonding', subject: 'Chemistry', difficulty: 0.4, prerequisites: ['CHEM_PERIODIC'] });
        this.addNode({ id: 'CHEM_COVALENT', label: 'Covalent Bonding', subject: 'Chemistry', difficulty: 0.45, prerequisites: ['CHEM_PERIODIC'] });
        this.addNode({ id: 'CHEM_METALLIC', label: 'Metallic Bonding', subject: 'Chemistry', difficulty: 0.4, prerequisites: ['CHEM_PERIODIC'] });

        // Reactions
        this.addNode({ id: 'CHEM_REACTIONS', label: 'Chemical Reactions', subject: 'Chemistry', difficulty: 0.25, prerequisites: ['CHEM_ATOMS'] });
        this.addNode({ id: 'CHEM_BALANCING', label: 'Balancing Equations', subject: 'Chemistry', difficulty: 0.35, prerequisites: ['CHEM_REACTIONS'] });
        this.addNode({ id: 'CHEM_REDOX', label: 'Oxidation & Reduction', subject: 'Chemistry', difficulty: 0.45, prerequisites: ['CHEM_REACTIONS'] });
        this.addNode({ id: 'CHEM_ACIDS_BASES', label: 'Acids, Bases & Salts', subject: 'Chemistry', difficulty: 0.35, prerequisites: ['CHEM_REACTIONS'] });
        this.addNode({ id: 'CHEM_PH', label: 'pH Scale', subject: 'Chemistry', difficulty: 0.4, prerequisites: ['CHEM_ACIDS_BASES'] });

        // Stoichiometry
        this.addNode({ id: 'CHEM_MOLE', label: 'Mole Concept', subject: 'Chemistry', difficulty: 0.4, prerequisites: ['CHEM_ATOMS', 'MATH_RATIOS'] });
        this.addNode({ id: 'CHEM_STOICHIOMETRY', label: 'Stoichiometry', subject: 'Chemistry', difficulty: 0.5, prerequisites: ['CHEM_MOLE', 'CHEM_BALANCING'] });

        // Organic
        this.addNode({ id: 'CHEM_CARBON', label: 'Carbon & Its Compounds', subject: 'Chemistry', difficulty: 0.45, prerequisites: ['CHEM_COVALENT'] });
        this.addNode({ id: 'CHEM_HYDROCARBONS', label: 'Hydrocarbons', subject: 'Chemistry', difficulty: 0.5, prerequisites: ['CHEM_CARBON'] });
        this.addNode({ id: 'CHEM_FUNCTIONAL', label: 'Functional Groups', subject: 'Chemistry', difficulty: 0.55, prerequisites: ['CHEM_HYDROCARBONS'] });

        // Metals
        this.addNode({ id: 'CHEM_METALS', label: 'Metals & Non-metals', subject: 'Chemistry', difficulty: 0.3, prerequisites: ['CHEM_PERIODIC'] });
        this.addNode({ id: 'CHEM_EXTRACTION', label: 'Extraction of Metals', subject: 'Chemistry', difficulty: 0.45, prerequisites: ['CHEM_METALS', 'CHEM_REDOX'] });

        // ==================== BIOLOGY ====================
        // Cell Biology
        this.addNode({ id: 'BIO_CELL', label: 'Cell Structure', subject: 'Biology', difficulty: 0.2, prerequisites: [] });
        this.addNode({ id: 'BIO_CELL_ORGANELLES', label: 'Cell Organelles', subject: 'Biology', difficulty: 0.3, prerequisites: ['BIO_CELL'] });
        this.addNode({ id: 'BIO_CELL_DIVISION', label: 'Cell Division (Mitosis & Meiosis)', subject: 'Biology', difficulty: 0.45, prerequisites: ['BIO_CELL'] });

        // Life Processes
        this.addNode({ id: 'BIO_NUTRITION', label: 'Nutrition', subject: 'Biology', difficulty: 0.25, prerequisites: [] });
        this.addNode({ id: 'BIO_PHOTOSYNTHESIS', label: 'Photosynthesis', subject: 'Biology', difficulty: 0.4, prerequisites: ['BIO_NUTRITION', 'BIO_CELL'] });
        this.addNode({ id: 'BIO_RESPIRATION', label: 'Respiration', subject: 'Biology', difficulty: 0.4, prerequisites: ['BIO_NUTRITION', 'BIO_CELL'] });
        this.addNode({ id: 'BIO_TRANSPORT', label: 'Transportation in Organisms', subject: 'Biology', difficulty: 0.35, prerequisites: ['BIO_CELL'] });
        this.addNode({ id: 'BIO_EXCRETION', label: 'Excretion', subject: 'Biology', difficulty: 0.35, prerequisites: ['BIO_TRANSPORT'] });

        // Control & Coordination
        this.addNode({ id: 'BIO_NERVOUS', label: 'Nervous System', subject: 'Biology', difficulty: 0.45, prerequisites: ['BIO_CELL'] });
        this.addNode({ id: 'BIO_HORMONES', label: 'Hormones & Endocrine System', subject: 'Biology', difficulty: 0.45, prerequisites: ['BIO_CELL'] });
        this.addNode({ id: 'BIO_REFLEX', label: 'Reflex Actions', subject: 'Biology', difficulty: 0.4, prerequisites: ['BIO_NERVOUS'] });

        // Reproduction
        this.addNode({ id: 'BIO_REPRODUCTION', label: 'Reproduction Basics', subject: 'Biology', difficulty: 0.3, prerequisites: ['BIO_CELL'] });
        this.addNode({ id: 'BIO_ASEXUAL', label: 'Asexual Reproduction', subject: 'Biology', difficulty: 0.25, prerequisites: ['BIO_REPRODUCTION'] });
        this.addNode({ id: 'BIO_SEXUAL', label: 'Sexual Reproduction', subject: 'Biology', difficulty: 0.4, prerequisites: ['BIO_REPRODUCTION', 'BIO_CELL_DIVISION'] });
        this.addNode({ id: 'BIO_HUMAN_REPRO', label: 'Human Reproductive System', subject: 'Biology', difficulty: 0.45, prerequisites: ['BIO_SEXUAL'] });

        // Genetics & Evolution
        this.addNode({ id: 'BIO_HEREDITY', label: 'Heredity', subject: 'Biology', difficulty: 0.45, prerequisites: ['BIO_CELL_DIVISION'] });
        this.addNode({ id: 'BIO_MENDEL', label: "Mendel's Laws", subject: 'Biology', difficulty: 0.5, prerequisites: ['BIO_HEREDITY'] });
        this.addNode({ id: 'BIO_DNA', label: 'DNA & Genes', subject: 'Biology', difficulty: 0.55, prerequisites: ['BIO_HEREDITY'] });
        this.addNode({ id: 'BIO_EVOLUTION', label: 'Evolution', subject: 'Biology', difficulty: 0.5, prerequisites: ['BIO_HEREDITY'] });

        // Ecology
        this.addNode({ id: 'BIO_ECOSYSTEM', label: 'Ecosystems', subject: 'Biology', difficulty: 0.3, prerequisites: [] });
        this.addNode({ id: 'BIO_FOOD_CHAIN', label: 'Food Chains & Webs', subject: 'Biology', difficulty: 0.25, prerequisites: ['BIO_ECOSYSTEM'] });
        this.addNode({ id: 'BIO_ENVIRONMENT', label: 'Environmental Issues', subject: 'Biology', difficulty: 0.3, prerequisites: ['BIO_ECOSYSTEM'] });

        // ==================== ENGLISH ====================
        // Grammar
        this.addNode({ id: 'ENG_NOUNS', label: 'Nouns', subject: 'English', difficulty: 0.1, prerequisites: [] });
        this.addNode({ id: 'ENG_PRONOUNS', label: 'Pronouns', subject: 'English', difficulty: 0.15, prerequisites: ['ENG_NOUNS'] });
        this.addNode({ id: 'ENG_VERBS', label: 'Verbs & Tenses', subject: 'English', difficulty: 0.2, prerequisites: [] });
        this.addNode({ id: 'ENG_ADJECTIVES', label: 'Adjectives & Adverbs', subject: 'English', difficulty: 0.2, prerequisites: ['ENG_NOUNS', 'ENG_VERBS'] });
        this.addNode({ id: 'ENG_PREPOSITIONS', label: 'Prepositions', subject: 'English', difficulty: 0.25, prerequisites: [] });
        this.addNode({ id: 'ENG_CONJUNCTIONS', label: 'Conjunctions', subject: 'English', difficulty: 0.25, prerequisites: [] });
        this.addNode({ id: 'ENG_ACTIVE_PASSIVE', label: 'Active & Passive Voice', subject: 'English', difficulty: 0.35, prerequisites: ['ENG_VERBS'] });
        this.addNode({ id: 'ENG_DIRECT_INDIRECT', label: 'Direct & Indirect Speech', subject: 'English', difficulty: 0.4, prerequisites: ['ENG_VERBS'] });
        this.addNode({ id: 'ENG_SUBJECT_VERB', label: 'Subject-Verb Agreement', subject: 'English', difficulty: 0.3, prerequisites: ['ENG_NOUNS', 'ENG_VERBS'] });
        this.addNode({ id: 'ENG_ARTICLES', label: 'Articles', subject: 'English', difficulty: 0.2, prerequisites: ['ENG_NOUNS'] });
        this.addNode({ id: 'ENG_MODALS', label: 'Modals', subject: 'English', difficulty: 0.3, prerequisites: ['ENG_VERBS'] });

        // Writing
        this.addNode({ id: 'ENG_SENTENCE', label: 'Sentence Structure', subject: 'English', difficulty: 0.25, prerequisites: ['ENG_NOUNS', 'ENG_VERBS'] });
        this.addNode({ id: 'ENG_PARAGRAPH', label: 'Paragraph Writing', subject: 'English', difficulty: 0.35, prerequisites: ['ENG_SENTENCE'] });
        this.addNode({ id: 'ENG_ESSAY', label: 'Essay Writing', subject: 'English', difficulty: 0.5, prerequisites: ['ENG_PARAGRAPH'] });
        this.addNode({ id: 'ENG_LETTER', label: 'Letter Writing', subject: 'English', difficulty: 0.4, prerequisites: ['ENG_PARAGRAPH'] });

        console.log(`[KnowledgeGraph] Initialized with ${this.nodes.size} concepts across Math, Physics, Chemistry, Biology, English`);
    }
}

export const knowledgeGraph = new KnowledgeGraph();
