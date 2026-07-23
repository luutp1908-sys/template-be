// runtime switch: choose implementation based on MOCK_MODE
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
const impl = isMock ? require('./template.repository.mock') : require('./template.repository.prisma');
export const TemplateRepository = impl.TemplateRepository;
export default TemplateRepository;
// Note: keep only runtime value export; do not export conflicting type alias