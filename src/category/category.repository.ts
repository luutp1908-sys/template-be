// runtime switch: choose implementation based on MOCK_MODE
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
const impl = isMock ? require('./category.repository.mock') : require('./category.repository.prisma');
export const CategoryRepository = impl.CategoryRepository;
export default CategoryRepository;
// Note: keep only runtime value export; do not export conflicting type alias
