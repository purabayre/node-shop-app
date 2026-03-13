const fs = require('fs');
const path = require('path');

exports.deleteFile = (filePath) => {
  // Remove leading slash if exists
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;

  const fullPath = path.join(__dirname, '..', 'public', cleanPath);

  fs.unlink(fullPath, (err) => {
    if (err) {
      console.log('File delete skipped (not found).');
    }
  });
};
