(function () {
  var App = window.App;
  if (!App || !App.ready) return;
  var el = App.el;
  var page = document.body.dataset.page;
  var slot = document.getElementById('message');

  function byId(id) {
    return document.getElementById(id);
  }

  var pages = {};

  pages.medicine = async function () {
    var q = (new URLSearchParams(window.location.search).get('q') || '').trim();
    var holder = byId('results');
    byId('q').value = q;
    if (!q) return;

    var result;
    try {
      result = await App.api('/pharmalink/medicines?name=' + encodeURIComponent(q));
    } catch (err) {
      App.showMessage(slot, 'error', err.message);
      return;
    }
    var rows = result.data;
    if (result.stale) {
      var time = new Date(result.asOf).toLocaleTimeString();
      App.showMessage(slot, 'error', 'Showing saved stock from ' + time + '. PharmaLink is not responding, so this may be out of date.');
    }
    if (!rows.length) {
      holder.appendChild(el('p', { text: 'No pharmacy lists "' + q + '" right now.' }));
      return;
    }
    holder.appendChild(el('h3', { text: 'Pharmacies with "' + q + '" ' + (result.stale ? ' (saved copy)' : ' (live from PharmaLink)') }));
    var body = rows.map(function (r) {
      return el('tr', {}, [
        el('td', { text: r.name }),
        el('td', { text: r.pharmacyName + ' (' + r.area + ')' }),
        el('td', { text: App.money(r.price) }),
        el('td', { text: r.quantity > 0 ? String(r.quantity) : 'Out of stock' }),
        el('td', {}, [el('a', { class: 'btn-sm secondary', href: 'pharmacy_details.html?id=' + encodeURIComponent(r.pharmacyId), text: 'Directions' })])
      ]);
    });
    holder.appendChild(
      el('div', { class: 'table-wrap' }, [
        el('table', {}, [
          el('thead', {}, [el('tr', {}, ['Medicine', 'Pharmacy', 'Price (Ksh)', 'In stock', ''].map(function (h) { return el('th', { text: h }); }))]),
          el('tbody', {}, body)
        ])
      ])
    );
  };

  pages.map = async function () {
    var holder = byId('map-holder');
    var pharmacies;
    try {
      pharmacies = await App.api('/pharmalink/pharmacies');
    } catch (err) {
      App.showMessage(slot, 'error', err.message);
      return;
    }
    var located = pharmacies.filter(function (p) {
      return p.latitude !== null && p.longitude !== null;
    });
    if (!located.length) {
      holder.appendChild(el('p', { text: 'No pharmacies with map coordinates were found.' }));
      return;
    }

    if (typeof window.L === 'undefined') {
      App.showMessage(slot, 'error', 'The map library could not load. Check your internet connection and refresh.');
    } else {
      var mapBox = el('div', { id: 'pl-map', class: 'map-box' });
      holder.appendChild(mapBox);
      var map = window.L.map(mapBox).setView([located[0].latitude, located[0].longitude], 13);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      var bounds = [];
      located.forEach(function (p) {
        var popup = el('div', {}, [el('strong', { text: p.name })]);
        if (p.address) popup.appendChild(el('div', { text: p.address }));
        if (p.id !== '') popup.appendChild(el('a', { href: 'pharmacy_details.html?id=' + encodeURIComponent(p.id), text: 'Call / Directions' }));
        window.L.marker([p.latitude, p.longitude]).addTo(map).bindPopup(popup);
        bounds.push([p.latitude, p.longitude]);
      });
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [30, 30] });
    }

    holder.appendChild(el('h3', { text: 'Pharmacies' }));
    holder.appendChild(
      el('ul', { class: 'plain' }, pharmacies.map(function (p) {
        var item = el('li', {}, [p.name]);
        if (p.id !== '') item.appendChild(el('span', {}, [' - ', el('a', { href: 'pharmacy_details.html?id=' + encodeURIComponent(p.id), text: 'Call / Directions' })]));
        return item;
      }))
    );
  };

  pages.pharmacy = async function () {
    var id = (new URLSearchParams(window.location.search).get('id') || '').trim();
    var holder = byId('pharmacy-holder');
    if (!id) {
      App.showMessage(slot, 'error', 'No pharmacy selected.');
      return;
    }
    var p;
    try {
      p = await App.api('/pharmalink/pharmacies/' + encodeURIComponent(id));
    } catch (err) {
      App.showMessage(slot, 'error', err.message);
      return;
    }
    holder.appendChild(el('h3', { text: p.name }));
    holder.appendChild(el('p', {}, [el('strong', { text: 'Address: ' }), p.address || 'Not available']));
    holder.appendChild(el('p', {}, [el('strong', { text: 'Phone: ' }), p.phone || 'Not available']));

    var actions = el('div', { class: 'page-actions' });
    var phone = p.phone.replace(/[^0-9+]/g, '');
    if (phone) actions.appendChild(el('a', { class: 'btn-sm', href: 'tel:' + phone, text: 'Call' }));
    var destination = '';
    if (p.latitude !== null && p.longitude !== null) destination = p.latitude + ',' + p.longitude;
    else if (p.address) destination = p.address;
    if (destination) {
      actions.appendChild(
        el('a', {
          class: 'btn-sm',
          href: 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination),
          target: '_blank',
          rel: 'noopener noreferrer',
          text: 'Directions'
        })
      );
    }
    actions.appendChild(el('a', { class: 'btn-sm secondary', href: 'pharmacies_map.html', text: 'Back to map' }));
    holder.appendChild(actions);
  };

  if (pages[page]) pages[page]();
})();
