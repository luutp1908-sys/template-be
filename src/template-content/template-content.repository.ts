// runtime switch: choose implementation based on MOCK_MODE
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
const impl = isMock ? require('./template-content.repository.mock') : require('./template-content.repository.prisma');
export const TemplateContentRepository = impl.TemplateContentRepository;
export default TemplateContentRepository;
// Note: keep only runtime value export; do not export conflicting type alias