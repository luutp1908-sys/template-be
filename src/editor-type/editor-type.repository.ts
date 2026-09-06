// runtime switch: choose implementation based on MOCK_MODE
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
const impl = isMock ? require('./editor-type.repository.mock') : require('./editor-type.repository.prisma');
export const EditorTypeRepository = impl.EditorTypeRepository;
export default EditorTypeRepository;
// Note: keep only runtime value export; do not export conflicting type alias
