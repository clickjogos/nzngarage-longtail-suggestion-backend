# export KUBECONFIG=/Users/regianyalmeida/.bluemix/plugins/container-service/clusters/btmf04jd0ueubi9pihrg/kube-config-sjc03-nzn-garage-cluster.yml
cp ../connectors/* ./connectors
docker build -t us.icr.io/nzngarage/schedule-update-job:latest .
docker push us.icr.io/nzngarage/schedule-update-job:latest
kubectl delete -f schedule-job-deployment.yml
kubectl apply -f schedule-job-deployment.yml
# rm -r ./connectors