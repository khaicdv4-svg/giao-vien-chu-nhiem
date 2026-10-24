const fs = require('fs');
const domain = require('./app/review-domain.js');

const fixture = JSON.parse(fs.readFileSync('kiem-thu/fixtures/review-tiengviet4-doc-hieu.json', 'utf-8'));

console.log('=== Fixture Debug ===');
console.log('Input:', {
  id: fixture.id,
  title: fixture.title,
  blocks: fixture.blocks?.length || 0,
  questions: fixture.questions?.length || 0,
  metadata: fixture.metadata
});

try {
  console.log('\n1. Normalize...');
  const normalized = domain.normalizeDocument(fixture);
  console.log('✓ Normalize OK');
  console.log('  ID:', normalized.id);
  console.log('  Status:', normalized.status);
  
  console.log('\n2. Validate...');
  const errors = domain.validateDocument(normalized);
  if (errors.length) {
    console.log('❌ Validate errors:');
    errors.forEach(e => console.log('   -', e));
  } else {
    console.log('✓ Validate OK');
  }
  
  console.log('\n3. createAttempt (cần status=published)...');
  if (normalized.status !== 'published') {
    console.log('❌ Status là', normalized.status, ', cần published');
    console.log('   → Cần transition document trước');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
}
