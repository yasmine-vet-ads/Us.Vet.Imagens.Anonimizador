# Us.Vet Image Anonymizer

An open-source MVP for anonymizing veterinary ultrasound images.

**Us.Vet Image Anonymizer** helps remove sensitive information from veterinary ultrasound images, such as the patient or owner's name, examination ID, date, clinic name, and other information displayed by ultrasound equipment.

The project was inspired by routine veterinary diagnostic imaging workflows. Images of dogs, cats, and small mammals may contain identifiable information that must be protected before they are used in studies, classes, presentations, publications, portfolios, or clinical datasets.

---

## Objective

Provide a simple tool for protecting sensitive regions in veterinary ultrasound images and generating clean copies for educational, academic, and technical use.

The project focuses on:

- data privacy;
- veterinary diagnostic imaging;
- image anonymization;
- technical documentation;
- educational and academic use;
- workflow automation;
- VetTech solutions.

---

## Problem

Ultrasound images frequently display sensitive information, including:

- patient name;
- owner name;
- examination date;
- equipment identification;
- clinic or hospital name;
- examination or medical-record number;
- administrative data;
- other personal or institutional information.

When these images are used in educational materials, classes, publications, presentations, portfolios, or test datasets, identifiable information must be removed or hidden to preserve privacy.

Manual anonymization can be slow, inconsistent, and prone to errors.

---

## Solution

The application provides a simple interface for uploading up to 10 ultrasound images at a time, configuring sensitive border regions, reviewing the result, and downloading the anonymized images.

By default, a black bar covers 4% of the image height at both the header and footer. These percentages can be adjusted for images produced by equipment with a different layout. The application also supports blur and pixelation modes, as well as optional masks on the left and right edges.

All processed images are exported as RGB PNG files without retaining the original EXIF metadata.

---

## Target Audience

- Veterinarians;
- veterinary ultrasonographers;
- veterinary medicine students;
- researchers;
- lecturers and educators;
- veterinary clinics and hospitals;
- diagnostic imaging projects;
- HealthTech and VetTech initiatives.

---

## Project Status

🚧 MVP under active development.

The project currently includes a functional Streamlit application, batch processing for up to 10 images, configurable anonymization masks, individual download, ZIP download, automated tests, documentation, and an anonymized sample image.

---

## Current Features

- Upload up to 10 ultrasound images per batch;
- support for PNG, JPG, and JPEG files;
- configurable black-bar, blur, and pixelation modes;
- configurable masks for the top, bottom, left, and right edges;
- default 4% header and footer masks;
- side-by-side preview of the first original and anonymized image;
- individual download of the first anonymized image;
- download of every processed image in a single ZIP archive;
- sequential and identifiable output filenames;
- RGB PNG export without preserving the original EXIF metadata;
- local processing without an external database;
- automated tests for masks and metadata-free export.

---

## Planned Features

- Manual selection of sensitive regions;
- device-specific mask profiles;
- semi-automatic text detection using OCR;
- processing history;
- anonymized image database;
- classification by organ, species, and ultrasound finding;
- additional before-and-after examples;
- improved interface and user guidance.

---

## Technologies

- Python;
- Streamlit;
- Pillow;
- NumPy;
- OpenCV;
- Jupyter Notebook;
- Git and GitHub.

---

## Project Structure

```text
Us.Vet.Imagens.Anonimizador/
├── app/
│   ├── anonimizador.py
│   └── main.py
├── docs/
│   ├── regras_anonimizacao.md
│   └── requisitos.md
├── notebooks/
│   └── UsVet_Anonimizador_MVP.ipynb
├── tests/
│   └── test_anonimizador.py
├── .gitignore
├── LICENSE
├── README.md
└── requirements.txt
```

---

## Installation

### Requirements

- Python 3.9 or newer;
- `pip`;
- dependencies listed in `requirements.txt`.

### 1. Clone the repository

```bash
git clone https://github.com/yasmine-vet-ads/Us.Vet.Imagens.Anonimizador.git
```

### 2. Open the project directory

```bash
cd Us.Vet.Imagens.Anonimizador
```

### 3. Create a virtual environment (recommended)

On Linux or macOS:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

On Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

### 4. Install the dependencies

```bash
python -m pip install -r requirements.txt
```

---

## Running the Application

Start the Streamlit interface from the repository root:

```bash
streamlit run app/main.py
```

Streamlit will display the local application address in the terminal. It normally uses:

```text
http://localhost:8501
```

---

## How to Use

1. Start the application with `streamlit run app/main.py`.
2. Select an anonymization mode in the sidebar:
   - **Black bar** (`Tarja preta`);
   - **Blur** (`Desfoque`);
   - **Pixelation** (`Pixelização`).
3. Keep the default 4% header and footer masks or adjust them for the ultrasound device layout.
4. Upload between 1 and 10 PNG, JPG, or JPEG images.
5. Compare the original and anonymized versions of the first image.
6. Download the first anonymized image individually if desired.
7. Download all anonymized images in the generated ZIP archive.
8. Review every exported image before publishing or sharing it.

If more than 10 files are selected, the application asks the user to remove the extra files before processing continues.

---

## Output Files

Images in the ZIP archive use sequential filenames in the following format:

```text
usvet_anonimizada_001_original-name.png
usvet_anonimizada_002_original-name.png
usvet_anonimizada_003_original-name.png
```

The generated ZIP file is named:

```text
usvet_imagens_anonimizadas.zip
```

The application processes images in memory and does not require an external database for the current MVP.

---

## Running the Tests

Run the automated test suite from the repository root:

```bash
python -m unittest discover -s tests -v
```

The tests verify:

- the default header and footer masks;
- custom left and right masks;
- PNG and RGB output;
- removal of EXIF metadata from exported images.

You can also check that all Python files compile successfully:

```bash
python -m compileall -q app tests
```

---

## Anonymization Rules

Detailed anonymization guidance is available in:

- [`docs/regras_anonimizacao.md`](docs/regras_anonimizacao.md)

The following information should be removed whenever it could identify a patient, owner, professional, or institution:

- patient name;
- owner name;
- clinic name;
- professional name;
- medical-record or examination number;
- examination date;
- phone number;
- address;
- equipment identification, when necessary;
- any other visible personal information.

Regional masking cannot guarantee that every sensitive field has been detected. Always review each anonymized image manually before external use.

---

## Ethical and Privacy Considerations

This project is intended for educational, technical, and experimental purposes.

The tool does not replace human review or an organization's privacy and compliance procedures. Before using real clinical images, confirm that all information capable of identifying the following has been removed:

- the patient;
- the owner;
- the clinic or hospital;
- the veterinary professional;
- the examination date or number;
- sensitive administrative information.

Use of clinical images must comply with applicable privacy laws, consent requirements, professional ethics, and institutional policies.

For public repositories, use only:

- fictional images;
- images that have already been anonymized and manually reviewed;
- demonstration screenshots;
- simulated datasets.

---

## Limitations

- The application masks configured image regions; it does not automatically understand all text displayed in an image.
- Sensitive information outside the selected borders may remain visible.
- Different ultrasound devices may require different mask percentages.
- Blur and pixelation may not be appropriate for highly sensitive text; a black bar provides stronger visual removal.
- Every result requires manual review before publication, teaching, research, or sharing.

---

## Related Project

This project is related to [Ia-Vet-Doc](https://github.com/yasmine-vet-ads/Ia-Vet-Doc), which focuses on organizing, searching, and structuring veterinary documents.

While **Us.Vet Image Anonymizer** focuses on removing sensitive information from ultrasound images, **Ia-Vet-Doc** explores document processing, reports, and contextual access to technical information.

Together, the projects represent a development path connecting:

1. veterinary ultrasound image anonymization;
2. organization of reports and technical documents;
3. contextual access to clinical information;
4. structured imaging findings;
5. support for veterinary documentation;
6. preparation of data for teaching, research, and portfolios.

---

## Roadmap

- [x] Create the initial repository;
- [x] structure the application;
- [x] create the initial documentation;
- [x] add an anonymized sample image;
- [x] organize dependencies;
- [x] process up to 10 images per batch;
- [x] export the processed batch as a ZIP archive;
- [x] add configurable header and footer masks;
- [x] add automated tests;
- [ ] improve the interface;
- [ ] document the workflow with screenshots;
- [ ] add more before-and-after examples;
- [ ] add manual region selection;
- [ ] investigate semi-automatic text detection;
- [ ] integrate with document organization workflows.

---

## Project Value

This project originated from a real need in veterinary diagnostic imaging workflows.

In addition to demonstrating practical knowledge of Python, Streamlit, OpenCV, image processing, and automated testing, it applies technology to a concrete challenge: protecting sensitive information in ultrasound images before educational, academic, or technical use.

The project connects veterinary medicine, diagnostic imaging, data privacy, automation, and the development of practical digital solutions.

---

## Author

**Yasmine Santos**<br>
Systems Analysis and Development student — IFRS<br>
Veterinarian specialized in Diagnostic Imaging<br>
GitHub: [yasmine-vet-ads](https://github.com/yasmine-vet-ads)

---

## License

This project is distributed under the terms described in the [`LICENSE`](LICENSE) file.
