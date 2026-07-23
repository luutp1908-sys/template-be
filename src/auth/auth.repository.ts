// runtime switch: choose implementation based on MOCK_MODE
const isMock = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1';
const impl = isMock ? require('./auth.repository.mock') : require('./auth.repository.prisma');
export const AuthRepository = impl.AuthRepository;
export default AuthRepository;
// Note: keep only runtime value export; do not export conflicting type alias
