FROM jupyter/scipy-notebook
RUN pip install requests feature_engine "pandas<3.0" "numba>=0.59" "numpy==1.26.4"