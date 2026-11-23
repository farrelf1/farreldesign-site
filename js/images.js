/* Real images. Put a file in images/ and write its path in data-image on a project in
   index.html, for example data-image="images/bri.jpg". It replaces that project's
   placeholder in the list, the viewer, the thumbnail strip and the popup. */
(function () {
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const css = (src) => 'url("' + new URL(src, document.baseURI).href + '")';
  function setImage(poster, src) {
    if (!poster || !src) return;
    poster.classList.add('has-img');
    poster.style.setProperty('--img', css(src));
  }
  const projects = $$('.project');
  const frames = $$('.viewer-frame .poster');
  const thumbs = $$('.viewer-strip .poster');
  projects.forEach((li, i) => {
    const src = li.dataset.image;
    setImage(li.querySelector('.inline-poster'), src);
    setImage(frames[i], src);
    setImage(thumbs[i], src);
  });
  $$('.extra-list > li').forEach((li) => setImage(li.querySelector('.poster'), li.dataset.image));

  /* The popup poster is rebuilt each time it opens, so add the image after that. */
  const notePoster = document.querySelector('.note-poster');
  $$('[data-project]').forEach((b) => b.addEventListener('click', () => {
    const src = projects[+b.dataset.project] && projects[+b.dataset.project].dataset.image;
    notePoster.classList.toggle('has-img', !!src);
    if (src) notePoster.style.setProperty('--img', css(src));
  }));
})();
