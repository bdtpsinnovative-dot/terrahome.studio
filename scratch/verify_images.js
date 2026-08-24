const https = require('https');

const categories = [
  {
    key: "01_ORNAMENT",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779075153365-143.webp?v=1779075154654",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779075136272-330.webp?v=1779075137565",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779075109315-184.webp?v=1779075110531",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779075122152-475.webp?v=1779075123447",
    ]
  },
  {
    key: "02_BOOKENDS",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781494047650-726.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779078544795-355.webp?v=1779078545748",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779078565880-634.webp?v=1779078566854",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779088760685-836.webp?v=1779088761520",
    ]
  },
  {
    key: "03_CANDLE_HOLDERS",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1787545755823-349.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781062599943-712.webp?v=1781062601540",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781582702709-840.webp?v=1781582704453",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781582779997-837.webp?v=1781582780070",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781582820399-976.webp?v=1781582820424",
    ]
  },
  {
    key: "04_DECORATIVE_OBJECTS",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604706503-265.webp?v=1786604707101",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350044803-666.webp?v=1786350044169",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350045685-631.webp?v=1786350045084",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350087279-446.webp?v=1786350087140",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350090888-392.webp?v=1786350090482",
    ]
  },
  {
    key: "05_DOLLS_TOYS",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604772503-762.webp?v=1786604773067",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604774505-403.webp?v=1786604775122",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604776504-274.webp?v=1786604777190",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786604778504-554.webp?v=1786604779109",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/woodslabs/WS-1779097945917-948.webp?v=1779097947269",
    ]
  },
  {
    key: "06_TABLEWARE",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786439826243-927.webp?v=1786439827911",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350175135-402.webp?v=1786350174880",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350176468-964.webp?v=1786350175899",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350177488-614.webp?v=1786350176950",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786432839307-904.webp?v=1786432841077",
    ]
  },
  {
    key: "07_TRAYS",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781494032603-453.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786439826243-927.webp?v=1786439827911",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779076767119-215.webp?v=1779076769682",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779076786238-5.webp?v=1779076787979",
    ]
  },
  {
    key: "08_VESSELS",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1781170155375-345.webp",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350038342-287.webp?v=1786350037911",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350039477-151.webp?v=1786350038863",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350040478-8.webp?v=1786350039891",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786350240589-906.webp?v=1786350240296",
    ]
  },
  {
    key: "09_ART_WALL_DECOR",
    images: [
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779269612983-684.webp?v=1779269613167",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786675412963-359.webp?v=1786675413486",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786675414339-365.webp?v=1786675414726",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1786675415974-379.webp?v=1786675416624",
      "https://pub-258bd10e7e8c4a7690a74c54cfbdef93.r2.dev/original/1779269532491-461.webp?v=1779269532722",
    ]
  },
];

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode });
    }).on('error', (err) => {
      resolve({ url, status: err.message });
    });
  });
}

async function verifyAll() {
  for (const cat of categories) {
    console.log(`Checking ${cat.key}...`);
    for (const url of cat.images) {
      const res = await checkUrl(url);
      if (res.status !== 200) {
        console.error(`  ❌ FAILED (${res.status}): ${url}`);
      } else {
        console.log(`  ✅ 200 OK: ${url}`);
      }
    }
  }
}

verifyAll();
