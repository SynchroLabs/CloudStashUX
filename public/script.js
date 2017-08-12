// 
function createFolder () {
  bootbox.prompt("Create Folder", function (result) {
    if (result) {
      var dbx = new Dropbox({ accessToken: token });
      dbx.filesCreateFolder({ path: path + '/' + result })
      .then(function(response) {
        console.log("Created folder:", response);
        window.location.reload(true);
      })
      .catch(function(error) {
        console.error(error)
      });
    }
  });
}